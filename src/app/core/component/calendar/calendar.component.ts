import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';

@Component({
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calendar',
})
export class CalendarComponent implements OnInit, OnDestroy {
  // Output event for date selection
  @Output() dateSelected = new EventEmitter<Date>();

  // ViewChild reference to the calendar container
  @ViewChild('calendarContainer', { static: true }) calendarContainer!: ElementRef;

  // Touch event properties
  private touchStartX: number = 0;
  private touchEndX: number = 0;
  private swipeThreshold: number = 50; // Minimum distance for a swipe
  private swipeTimeout: number = 300; // Maximum time for a swipe in milliseconds
  private touchStartTime: number = 0;
  private touchEndTime: number = 0;
  private isSwiping: boolean = false;
  private swipeDirection: string = '';
  private swipeProgress: number = 0; // Percentage of swipe progress
  private isTouch: boolean = false; // Flag to track if a touch event is in progress

  // Bound event handlers
  private boundTouchStartHandler: (event: TouchEvent) => void;
  private boundTouchMoveHandler: (event: TouchEvent) => void;
  private boundTouchEndHandler: (event: TouchEvent) => void;

  // RxJS subjects for state management
  private destroy$ = new Subject<void>();
  private currentDateSubject = new BehaviorSubject<Date>(new Date());
  private isWeekViewSubject = new BehaviorSubject<boolean>(false);
  private calendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private nextCalendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private prevCalendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private selectedDateSubject = new BehaviorSubject<Date | null>(null);
  private swipeStateSubject = new BehaviorSubject<{ direction: string, progress: number }>({ direction: '', progress: 0 });
  private carouselPositionSubject = new BehaviorSubject<number>(-33.333); // Start at -33.333% to show current grid

  // Public observables
  currentDate$: Observable<Date> = this.currentDateSubject.asObservable();
  isWeekView$: Observable<boolean> = this.isWeekViewSubject.asObservable();
  calendarDays$: Observable<Date[]> = this.calendarDaysSubject.asObservable();
  nextCalendarDays$: Observable<Date[]> = this.nextCalendarDaysSubject.asObservable();
  prevCalendarDays$: Observable<Date[]> = this.prevCalendarDaysSubject.asObservable();
  selectedDate$: Observable<Date | null> = this.selectedDateSubject.asObservable();
  swipeState$: Observable<{ direction: string, progress: number }> = this.swipeStateSubject.asObservable();
  carouselPosition$: Observable<number> = this.carouselPositionSubject.asObservable();

  // Helper methods for template
  calculatePrevOpacity(state: { direction: string, progress: number } | null): number {
    if (state?.direction === 'right') {
      return Math.min(state.progress / 50, 1);
    }
    return 0;
  }

  calculateNextOpacity(state: { direction: string, progress: number } | null): number {
    if (state?.direction === 'left') {
      return Math.min(state.progress / 50, 1);
    }
    return 0;
  }

  // Static data
  weekDays: string[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor() {
    // Create bound handlers and store them as instance properties
    this.boundTouchStartHandler = this.handleTouchStart.bind(this);
    this.boundTouchMoveHandler = this.handleTouchMove.bind(this);
    this.boundTouchEndHandler = this.handleTouchEnd.bind(this);
  }

  ngOnInit() {
    // Generate calendar days whenever currentDate or isWeekView changes
    combineLatest([this.currentDate$, this.isWeekView$])
      .pipe(
        takeUntil(this.destroy$),
        tap(([currentDate, isWeekView]) => this.generateCalendarDays(currentDate, isWeekView))
      )
      .subscribe();

    // Add touch event listeners
    this.setupTouchEvents();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // Remove touch event listeners using the stored bound handlers
    if (this.calendarContainer && this.calendarContainer.nativeElement) {
      const element = this.calendarContainer.nativeElement;

      if (this.boundTouchStartHandler) {
        element.removeEventListener('touchstart', this.boundTouchStartHandler);
      }

      if (this.boundTouchMoveHandler) {
        element.removeEventListener('touchmove', this.boundTouchMoveHandler);
      }

      if (this.boundTouchEndHandler) {
        element.removeEventListener('touchend', this.boundTouchEndHandler);
      }
    }
  }

  // Setup touch event listeners
  private setupTouchEvents(): void {
    const element = this.calendarContainer.nativeElement;

    // Add event listeners using the bound handlers
    element.addEventListener('touchstart', this.boundTouchStartHandler, { passive: true });
    element.addEventListener('touchmove', this.boundTouchMoveHandler, { passive: false });
    element.addEventListener('touchend', this.boundTouchEndHandler, { passive: true });
  }

  // Handle touch start event
  private handleTouchStart(event: TouchEvent): void {
    // Set touch flag to true immediately to prevent click events from changing months during swipe
    this.isTouch = true;

    this.touchStartX = event.touches[0].clientX;
    this.touchEndX = 0;
    this.touchStartTime = new Date().getTime();
    this.isSwiping = true;

    // Reset swipe state
    this.swipeDirection = '';
    this.swipeProgress = 0;
    this.swipeStateSubject.next({ direction: '', progress: 0 });
  }

  // Handle touch move event
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isSwiping) return;

    this.touchEndX = event.touches[0].clientX;
    this.touchEndTime = new Date().getTime();

    // Calculate swipe distance
    const swipeDistance = this.touchEndX - this.touchStartX;

    // If horizontal swipe is detected, prevent default to avoid page scrolling
    if (Math.abs(swipeDistance) > 10) {
      event.preventDefault();
    }

    // Determine swipe direction
    this.swipeDirection = swipeDistance > 0 ? 'right' : 'left';

    // Get the container width for percentage calculations
    const containerWidth = this.calendarContainer.nativeElement.offsetWidth;

    // Calculate swipe progress as a percentage of container width
    const progressPercentage = (swipeDistance / containerWidth) * 100;

    // Calculate carousel position: -33.333% is the center (current grid)
    // Moving right (positive swipe) increases the percentage (towards 0%)
    // Moving left (negative swipe) decreases the percentage (towards -66.666%)
    const basePosition = -33.333;
    const newPosition = basePosition + (progressPercentage/3);

    // Limit the position to prevent overscrolling
    const limitedPosition = Math.max(Math.min(newPosition, 0), -66.666);

    // Update carousel position
    this.carouselPositionSubject.next(limitedPosition);

    // Store the progress for animation purposes
    this.swipeProgress = Math.abs(progressPercentage);

    // Update swipe state
    this.swipeStateSubject.next({
      direction: this.swipeDirection,
      progress: this.swipeProgress
    });
  }

  // Easing function for smoother animation
  private easeOutQuad(t: number): number {
    return t * (2 - t / 100);
  }

  // Handle touch end event
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isSwiping || this.touchEndX === 0) return;
    this.isSwiping = false;

    // Calculate swipe distance and duration
    const swipeDistance = this.touchEndX - this.touchStartX;
    const swipeDuration = this.touchEndTime - this.touchStartTime;

    // Get the container width for percentage calculations
    const containerWidth = this.calendarContainer.nativeElement.offsetWidth;

    // Calculate swipe percentage of container width
    const swipePercentage = (swipeDistance / containerWidth) * 100;

    // Get current carousel position
    const currentPosition = this.carouselPositionSubject.getValue();

    // Determine if the swipe should complete based on:
    // 1. If the swipe distance is more than 50% of the threshold (40% of container width)
    // 2. Or if the swipe was fast enough (high velocity)
    const swipeThresholdPercentage = 40; // 40% of container width
    const swipeVelocity = Math.abs(swipeDistance) / swipeDuration;
    const isHighVelocity = swipeVelocity > 0.6; // pixels per millisecond

    const shouldCompleteSwipe =
      Math.abs(swipePercentage) > swipeThresholdPercentage ||
      (Math.abs(swipeDistance) > this.swipeThreshold && isHighVelocity);

    if (shouldCompleteSwipe) {
      // Determine target position based on swipe direction
      let targetPosition: number;
      let isSwipingLeft = false;

      if (swipeDistance > 0) { // Swiping right - go to previous
        targetPosition = 0; // Previous grid position
      } else { // Swiping left - go to next
        targetPosition = -66.666; // Next grid position
        isSwipingLeft = true;
      }

      // Animate to target position
      this.animateCarouselToPosition(targetPosition, () => {
        // After animation completes, update the current date
        if (targetPosition === 0) {
          // We moved to the previous grid
          this.navigateToPrevious();
        } else {
          // We moved to the next grid
          this.navigateToNext();
        }

        // For left swipes, don't animate back to center - just jump there instantly
        if (isSwipingLeft) {
          // Keep the swipe direction to prevent transition animation
          this.swipeStateSubject.next({ direction: 'left', progress: 0 });
          this.carouselPositionSubject.next(-33.333);

          // Reset the swipe state after a short delay to allow the DOM to update
          setTimeout(() => {
            this.swipeStateSubject.next({ direction: '', progress: 0 });
            this.isTouch = false;
          }, 1);
        } else {
          // For right swipes, use the same approach as left swipes
          // Keep the swipe direction to prevent transition animation
          this.swipeStateSubject.next({ direction: 'right', progress: 0 });
          this.carouselPositionSubject.next(-33.333);

          // Reset the swipe state after a short delay to allow the DOM to update
          setTimeout(() => {
            this.swipeStateSubject.next({ direction: '', progress: 0 });
            this.isTouch = false;
          }, 1);
        }
      });
    } else {
      // Animate back to center position
      this.animateCarouselToPosition(-33.333, () => {
        // Reset state after animation
        this.swipeStateSubject.next({ direction: '', progress: 0 });
        this.isTouch = false;
      });
    }
  }

  // Animate carousel to a target position
  private animateCarouselToPosition(targetPosition: number, callback?: () => void): void {
    // Get current position
    const startPosition = this.carouselPositionSubject.getValue();
    const startTime = performance.now();
    const duration = 200; // Increased animation duration for better visibility

    // Animation function
    const animate = (currentTime: number) => {
      // Calculate elapsed time
      const elapsedTime = currentTime - startTime;

      // Calculate progress (0 to 1)
      const progress = Math.min(elapsedTime / duration, 1);

      // Apply easing - using a more linear easing for finger-like movement
      const easedProgress = this.easeOutQuint(progress);

      // Calculate new position
      const newPosition = startPosition + (targetPosition - startPosition) * easedProgress;

      // Update carousel position
      this.carouselPositionSubject.next(newPosition);

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, call callback if provided
        if (callback) {
          callback();
        }
      }
    };

    // Start animation
    requestAnimationFrame(animate);
  }

  // Quint easing function for more natural finger-like movement
  private easeOutQuint(t: number): number {
    return 1 - Math.pow(1 - t, 5);
  }

  // Cubic easing function (kept for reference)
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Generate calendar days for the current month or week
  generateCalendarDays(currentDate: Date, isWeekView: boolean) {
    const days: Date[] = [];
    const nextDays: Date[] = [];
    const prevDays: Date[] = [];

    // Calculate next and previous dates
    const nextDate = this.getNextDate(currentDate, isWeekView);
    const prevDate = this.getPreviousDate(currentDate, isWeekView);

    if (isWeekView) {
      // Generate days for the current week
      this.generateWeekDays(currentDate, days);
      // Generate days for the next week
      this.generateWeekDays(nextDate, nextDays);
      // Generate days for the previous week
      this.generateWeekDays(prevDate, prevDays);
    } else {
      // Generate days for the current month
      this.generateMonthDays(currentDate, days);
      // Generate days for the next month
      this.generateMonthDays(nextDate, nextDays);
      // Generate days for the previous month
      this.generateMonthDays(prevDate, prevDays);
    }

    this.calendarDaysSubject.next(days);
    this.nextCalendarDaysSubject.next(nextDays);
    this.prevCalendarDaysSubject.next(prevDays);
  }

  // Get the date for the next month or week
  private getNextDate(currentDate: Date, isWeekView: boolean): Date {
    const nextDate = new Date(currentDate);

    if (isWeekView) {
      // Next week
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      // Next month
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  // Get the date for the previous month or week
  private getPreviousDate(currentDate: Date, isWeekView: boolean): Date {
    const prevDate = new Date(currentDate);

    if (isWeekView) {
      // Previous week
      prevDate.setDate(prevDate.getDate() - 7);
    } else {
      // Previous month
      prevDate.setMonth(prevDate.getMonth() - 1);
    }

    return prevDate;
  }

  // Generate days for the current month
  private generateMonthDays(currentDate: Date, days: Date[]) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Adjust for Monday as first day of week
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Add days from previous month to fill the first week
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonth = new Date(year, month, 0); // Last day of previous month
    const prevMonthLastDate = prevMonth.getDate();

    // Add days from the previous month in reverse order
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const day = prevMonthLastDate - i + 1;
      days.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day));
    }

    // Add all days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }
  }

  // Generate days for the current week
  private generateWeekDays(currentDate: Date, days: Date[]) {
    const currentDay = currentDate.getDay();
    // Adjust for Monday as first day of week
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

    // Calculate the first day of the week (Monday)
    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(currentDate.getDate() - adjustedCurrentDay);

    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      days.push(day);
    }
  }

  // Toggle between month and week view
  toggleView() {
    const currentValue = this.isWeekViewSubject.getValue();
    const selectedDate = this.selectedDateSubject.getValue();

    // If toggling to week view and a day is selected, update current date to show that week
    if (!currentValue && selectedDate) {
      this.currentDateSubject.next(new Date(selectedDate));
    }

    // Update the view
    this.isWeekViewSubject.next(!currentValue);
  }

  // Navigate to previous month or week (button click)
  navigatePrevious() {
    // Animate the carousel to the previous position
    this.animateCarouselToPosition(0, () => {
      // After animation completes, update the current date
      this.navigateToPrevious();

      // Keep the swipe direction as 'right' to prevent transition animation
      this.swipeStateSubject.next({ direction: 'right', progress: 0 });
      this.carouselPositionSubject.next(-33.333);

      // Reset the swipe state after a short delay to allow the DOM to update
      setTimeout(() => {
        this.swipeStateSubject.next({ direction: '', progress: 0 });
      }, 1);
    });
  }

  // Navigate to next month or week (button click)
  navigateNext() {
    // Animate the carousel to the next position
    this.animateCarouselToPosition(-66.666, () => {
      // After animation completes, update the current date
      this.navigateToNext();

      // Keep the swipe direction as 'left' to prevent transition animation
      this.swipeStateSubject.next({ direction: 'left', progress: 0 });
      this.carouselPositionSubject.next(-33.333);

      // Reset the swipe state after a short delay to allow the DOM to update
      setTimeout(() => {
        this.swipeStateSubject.next({ direction: '', progress: 0 });
      }, 1);
    });
  }

  // Update current date to previous month/week and regenerate calendar
  private navigateToPrevious() {
    const currentDate = new Date(this.currentDateSubject.getValue());
    const isWeekView = this.isWeekViewSubject.getValue();

    if (isWeekView) {
      // Go to previous week
      currentDate.setDate(currentDate.getDate() - 7);
    } else {
      // Go to previous month
      currentDate.setMonth(currentDate.getMonth() - 1);
    }
    this.currentDateSubject.next(currentDate);
  }

  // Update current date to next month/week and regenerate calendar
  private navigateToNext() {
    const currentDate = new Date(this.currentDateSubject.getValue());
    const isWeekView = this.isWeekViewSubject.getValue();

    if (isWeekView) {
      // Go to next week
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      // Go to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    this.currentDateSubject.next(currentDate);
  }

  // Navigate to today
  navigateToday() {
    // Update current date to today
    this.currentDateSubject.next(new Date());

    // Reset carousel position without animation
    this.swipeStateSubject.next({ direction: '', progress: 0 });
    this.carouselPositionSubject.next(-33.333);
  }

  // Check if a date is today
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // Check if a date is in the current month
  isCurrentMonth(date: Date): boolean {
    const currentDate = this.currentDateSubject.getValue();
    return date.getMonth() === currentDate.getMonth();
  }


  // Format date to display month and year
  formatMonthYear(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  // Get formatted month and year as Observable
  monthYear$: Observable<string> = this.currentDate$.pipe(
    map(date => this.formatMonthYear(date))
  );

  // Handle day selection
  selectDay(day: Date, event: MouseEvent): void {
    // Stop event propagation to prevent it from bubbling up
    event.stopPropagation();

    // Update selected date and emit event
    this.selectedDateSubject.next(day);
    this.dateSelected.emit(day);

    // Only change month if this is not part of a touch event (to prevent month change during swipe)
    if (!this.isTouch) {
      // If the day is from a different month, update the current date to that month
      const currentDate = this.currentDateSubject.getValue();
      if (day.getMonth() !== currentDate.getMonth()) {
        // Create a new date with the same year and month as the selected day, but keep the day of the current date
        const newDate = new Date(day.getFullYear(), day.getMonth(), currentDate.getDate());
        this.currentDateSubject.next(newDate);
      }
    }
  }

  // Check if a date is selected
  isSelected(day: Date): boolean {
    const selectedDate = this.selectedDateSubject.getValue();
    if (!selectedDate) return false;

    return day.getDate() === selectedDate.getDate() &&
           day.getMonth() === selectedDate.getMonth() &&
           day.getFullYear() === selectedDate.getFullYear();
  }
}
