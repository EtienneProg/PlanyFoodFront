import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

/**
 * Calendar component that supports month and week views with swipe navigation
 */
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

  // Icons for view toggle
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;

  // Constants
  private readonly CAROUSEL_CENTER_POSITION = -33.333;
  private readonly CAROUSEL_NEXT_POSITION = -66.666;
  private readonly CAROUSEL_PREV_POSITION = 0;
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
  private readonly ANIMATION_DURATION = 200; // Animation duration in milliseconds

  // Touch event properties
  private touchStartX = 0;
  private touchEndX = 0;
  private touchStartTime = 0;
  private touchEndTime = 0;
  private isTouch = false; // Flag to track if a touch event is in progress
  private isSwiping = false; // Flag to track if a swipe is in progress

  // Bound event handlers
  private boundTouchStartHandler: (event: TouchEvent) => void;
  private boundTouchMoveHandler: (event: TouchEvent) => void;
  private boundTouchEndHandler: (event: TouchEvent) => void;

  // RxJS subjects for state management
  private destroy$ = new Subject<void>();
  private currentDateSubject = new BehaviorSubject<Date>(new Date());
  private isWeekViewSubject = new BehaviorSubject<boolean>(true);
  private calendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private nextCalendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private prevCalendarDaysSubject = new BehaviorSubject<Date[]>([]);
  private selectedDateSubject = new BehaviorSubject<Date | null>(null);
  private swipeStateSubject = new BehaviorSubject<{ direction: string, progress: number }>({ direction: '', progress: 0 });
  private carouselPositionSubject = new BehaviorSubject<number>(this.CAROUSEL_CENTER_POSITION);

  // Public observables
  currentDate$: Observable<Date> = this.currentDateSubject.asObservable();
  isWeekView$: Observable<boolean> = this.isWeekViewSubject.asObservable();
  calendarDays$: Observable<Date[]> = this.calendarDaysSubject.asObservable();
  nextCalendarDays$: Observable<Date[]> = this.nextCalendarDaysSubject.asObservable();
  prevCalendarDays$: Observable<Date[]> = this.prevCalendarDaysSubject.asObservable();
  swipeState$: Observable<{ direction: string, progress: number }> = this.swipeStateSubject.asObservable();
  carouselPosition$: Observable<number> = this.carouselPositionSubject.asObservable();

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

  /**
   * Handle touch start event for swipe navigation
   */
  private handleTouchStart(event: TouchEvent): void {
    // Set touch flag to true immediately to prevent click events from changing months during swipe
    this.isTouch = true;
    this.touchStartX = event.touches[0].clientX;
    this.touchEndX = 0;
    this.touchStartTime = new Date().getTime();
    this.isSwiping = true;

    // Reset swipe state
    this.swipeStateSubject.next({ direction: '', progress: 0 });
  }

  /**
   * Handle touch move event for swipe navigation
   */
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
    const swipeDirection = swipeDistance > 0 ? 'right' : 'left';

    // Get the container width for percentage calculations
    const containerWidth = this.calendarContainer.nativeElement.offsetWidth;

    // Calculate swipe progress as a percentage of container width
    const progressPercentage = (swipeDistance / containerWidth) * 100;

    // Calculate carousel position based on swipe progress
    // Moving right (positive swipe) increases the percentage (towards CAROUSEL_PREV_POSITION)
    // Moving left (negative swipe) decreases the percentage (towards CAROUSEL_NEXT_POSITION)
    const newPosition = this.CAROUSEL_CENTER_POSITION + (progressPercentage/3);

    // Limit the position to prevent overscrolling
    const limitedPosition = Math.max(
      Math.min(newPosition, this.CAROUSEL_PREV_POSITION),
      this.CAROUSEL_NEXT_POSITION
    );

    // Update carousel position
    this.carouselPositionSubject.next(limitedPosition);

    // Calculate progress for animation purposes
    const swipeProgress = Math.abs(progressPercentage);

    // Update swipe state
    this.swipeStateSubject.next({
      direction: swipeDirection,
      progress: swipeProgress
    });
  }

  /**
   * Handle touch end event for swipe navigation
   * Determines if swipe should complete based on distance and velocity
   */
  private handleTouchEnd(event: TouchEvent): void {
    this.isTouch = false;
    if (!this.isSwiping || this.touchEndX === 0) return;
    this.isSwiping = false;

    // Calculate swipe distance and duration
    const swipeDistance = this.touchEndX - this.touchStartX;
    const swipeDuration = this.touchEndTime - this.touchStartTime;

    // Get the container width for percentage calculations
    const containerWidth = this.calendarContainer.nativeElement.offsetWidth;

    // Calculate swipe percentage of container width
    const swipePercentage = (swipeDistance / containerWidth) * 100;

    // Determine if the swipe should complete based on:
    // 1. If the swipe distance is more than the threshold percentage of container width
    // 2. Or if the swipe was fast enough (high velocity)
    const swipeThresholdPercentage = 40; // 40% of container width
    const swipeVelocity = Math.abs(swipeDistance) / swipeDuration;
    const isHighVelocity = swipeVelocity > 0.6; // pixels per millisecond

    const shouldCompleteSwipe =
      Math.abs(swipePercentage) > swipeThresholdPercentage ||
      (Math.abs(swipeDistance) > this.SWIPE_THRESHOLD && isHighVelocity);

    if (shouldCompleteSwipe) {
      // Determine target position based on swipe direction
      const isSwipingLeft = swipeDistance < 0;
      const targetPosition = isSwipingLeft ?
        this.CAROUSEL_NEXT_POSITION : // Swiping left - go to next
        this.CAROUSEL_PREV_POSITION;  // Swiping right - go to previous

      // Animate to target position
      this.animateCarouselToPosition(targetPosition, () => {
        // After animation completes, update the current date
        if (targetPosition === this.CAROUSEL_PREV_POSITION) {
          // We moved to the previous grid
          this.navigateToPrevious();
        } else {
          // We moved to the next grid
          this.navigateToNext();
        }

        // Reset carousel position
        this.resetCarouselPosition(isSwipingLeft ? 'left' : 'right');

      });
    } else {
      // Animate back to center position
      this.animateCarouselToPosition(this.CAROUSEL_CENTER_POSITION, () => {
        // Reset state after animation
        this.swipeStateSubject.next({ direction: '', progress: 0 });
      });
    }
  }

  /**
   * Animate carousel to a target position with easing
   * @param targetPosition The target position to animate to
   * @param callback Optional callback to execute after animation completes
   */
  private animateCarouselToPosition(targetPosition: number, callback?: () => void): void {
    // Get current position
    const startPosition = this.carouselPositionSubject.getValue();
    const startTime = performance.now();

    // Animation function
    const animate = (currentTime: number) => {
      // Calculate elapsed time
      const elapsedTime = currentTime - startTime;

      // Calculate progress (0 to 1)
      const progress = Math.min(elapsedTime / this.ANIMATION_DURATION, 1);

      // Apply easing for more natural movement
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

  /**
   * Quint easing function for more natural finger-like movement
   * Creates a smooth deceleration effect for animations
   * @param t Progress value between 0 and 1
   * @returns Eased value between 0 and 1
   */
  private easeOutQuint(t: number): number {
    return 1 - Math.pow(1 - t, 5);
  }

  /**
   * Generate calendar days for the current, next, and previous month/week
   * @param currentDate The current date to generate calendar days for
   * @param isWeekView Whether to generate days for week view or month view
   */
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

  /**
   * Get the date for the next month or week
   * @param currentDate The reference date
   * @param isWeekView Whether to get the next week (true) or next month (false)
   * @returns A new Date object representing the next period
   */
  private getNextDate(currentDate: Date, isWeekView: boolean): Date {
    const nextDate = new Date(currentDate);

    if (isWeekView) {
      // Next week (add 7 days)
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      // Next month
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  /**
   * Get the date for the previous month or week
   * @param currentDate The reference date
   * @param isWeekView Whether to get the previous week (true) or previous month (false)
   * @returns A new Date object representing the previous period
   */
  private getPreviousDate(currentDate: Date, isWeekView: boolean): Date {
    const prevDate = new Date(currentDate);

    if (isWeekView) {
      // Previous week (subtract 7 days)
      prevDate.setDate(prevDate.getDate() - 7);
    } else {
      // Previous month
      prevDate.setMonth(prevDate.getMonth() - 1);
    }

    return prevDate;
  }

  /**
   * Generate days for a month view
   * Includes days from previous and next months to fill complete weeks
   * @param currentDate The date to generate month days for
   * @param days Array to populate with the generated days
   */
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
    const prevMonth = new Date(year, month, 0);
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i));
    }

    // Add all days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays <= 7 && remainingDays > 0) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }
  }

  /**
   * Generate days for a week view
   * Creates a 7-day week starting from Monday
   * @param currentDate The date to generate week days for
   * @param days Array to populate with the generated days
   */
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

    // If switching from month view to week view and there's a selected date,
    // update the current date to the selected date to ensure the week containing
    // the selected date is displayed
    if (!currentValue) { // Switching from month view (false) to week view (true)
      const selectedDate = this.currentDateSubject.getValue();
      if (selectedDate) {
        this.currentDateSubject.next(new Date(selectedDate));
      }
    }

    this.isWeekViewSubject.next(!currentValue);
  }

  /**
   * Navigate to previous month or week with animation
   */
  navigatePrevious() {
    // Animate the carousel to the previous position
    this.animateCarouselToPosition(this.CAROUSEL_PREV_POSITION, () => {
      // After animation completes, update the current date
      this.navigateToPrevious();
      this.resetCarouselPosition('right');
    });
  }

  /**
   * Navigate to next month or week with animation
   */
  navigateNext() {
    // Animate the carousel to the next position
    this.animateCarouselToPosition(this.CAROUSEL_NEXT_POSITION, () => {
      // After animation completes, update the current date
      this.navigateToNext();
      this.resetCarouselPosition('left');
    });
  }

  /**
   * Reset carousel position after navigation
   * @param direction The direction of the swipe ('left' or 'right')
   */
  private resetCarouselPosition(direction: 'left' | 'right') {
    // Keep the swipe direction to prevent transition animation
    this.swipeStateSubject.next({ direction, progress: 0 });
    this.carouselPositionSubject.next(this.CAROUSEL_CENTER_POSITION);

    // Reset the swipe state after a short delay to allow the DOM to update
    setTimeout(() => {
      this.swipeStateSubject.next({ direction: '', progress: 0 });
    }, 1);
  }

  /**
   * Update current date to previous month/week
   * This will trigger calendar regeneration through the observable subscription
   */
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

  /**
   * Update current date to next month/week
   * This will trigger calendar regeneration through the observable subscription
   */
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

  /**
   * Navigate to today's date with animation
   */
  navigateToday() {
    const currentDate = this.currentDateSubject.getValue();
    const today = new Date();

    // If already on today, no need for animation
    if (this.isSameDate(currentDate, today)) {
      return;
    }

    // Determine if we're moving forward or backward to today
    const isMovingForward = this.isDateAfter(today, currentDate);

    if (isMovingForward) {
      // Animate to next position
      this.animateCarouselToPosition(this.CAROUSEL_NEXT_POSITION, () => {
        // Update current date to today
        this.currentDateSubject.next(new Date());
        this.resetCarouselPosition('left');
      });
    } else {
      // Animate to previous position
      this.animateCarouselToPosition(this.CAROUSEL_PREV_POSITION, () => {
        // Update current date to today
        this.currentDateSubject.next(new Date());
        this.resetCarouselPosition('right');
      });
    }
  }

  // Helper method to compare dates (ignoring time)
  private isSameDate(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Determines if date1 is chronologically after date2
   * Used for determining navigation direction
   */
  private isDateAfter(date1: Date, date2: Date): boolean {
    return date1.getFullYear() > date2.getFullYear() ||
      (date1.getFullYear() === date2.getFullYear() &&
       (date1.getMonth() > date2.getMonth() ||
        (date1.getMonth() === date2.getMonth() && date1.getDate() > date2.getDate())));
  }

  /**
   * Check if a date is today
   * Used for highlighting the current day in the calendar
   * @param date The date to check
   * @returns True if the date is today, false otherwise
   */
  isToday(date: Date): boolean {
    return this.isSameDate(date, new Date());
  }

  /**
   * Check if a date is in the current month
   * Used for styling days from other months differently
   * @param date The date to check
   * @returns True if the date is in the current month, false otherwise
   */
  isCurrentMonth(date: Date): boolean {
    const currentDate = this.currentDateSubject.getValue();
    return date.getMonth() === currentDate.getMonth();
  }

  /**
   * Format date to display month and year
   * @param date The date to format
   * @returns Formatted string with month and year (e.g., "Janvier 2023")
   */
  formatMonthYear(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  /**
   * Observable that emits the formatted month and year of the current date
   * Used in the template to display the current month/year
   */
  monthYear$: Observable<string> = this.currentDate$.pipe(
    map(date => this.formatMonthYear(date))
  );

  /**
   * Handle day selection with animation when changing months
   */
  selectDay(day: Date, event: MouseEvent): void {
    // Stop event propagation to prevent it from bubbling up
    event.stopPropagation();
      // Update selected date and emit event
    this.selectedDateSubject.next(day);
    this.dateSelected.emit(day);

    // If the day is from a different month, update the current date to that month
    const currentDate = this.currentDateSubject.getValue();
    // Create a new date with the selected day's year, month, and date
    const newDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    this.currentDateSubject.next(newDate);
    // Only change month if this is not part of a touch event (to prevent month change during swipe)
    if (!this.isTouch) {
      if (day.getMonth() !== currentDate.getMonth()) {
        // Determine if we're moving to a future or past month
        const isMovingForward = this.isDateAfter(day, currentDate);

        if (isMovingForward) {
          // Animate to next month
          this.animateCarouselToPosition(this.CAROUSEL_NEXT_POSITION, () => {
            this.resetCarouselPosition('left');
          });
        } else {
          // Animate to previous month
          this.animateCarouselToPosition(this.CAROUSEL_PREV_POSITION, () => {
            this.resetCarouselPosition('right');
          });
        }
      }
    }
  }

  /**
   * Check if a date is the currently selected date
   * Used for highlighting the selected day in the calendar
   * @param day The date to check
   * @returns True if the date is selected, false otherwise
   */
  isSelected(day: Date): boolean {
    const selectedDate = this.selectedDateSubject.getValue();
    if (!selectedDate) return false;

    return this.isSameDate(day, selectedDate);
  }

}
