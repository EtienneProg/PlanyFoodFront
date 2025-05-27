import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
  UrlSegment,
} from '@angular/router';

export class RouteInterceptor implements RouteReuseStrategy {
  private currentParentRoute: string | null = null;
  private readonly storedRoutes = new Map<string, DetachedRouteHandle>();

  // if true calls store
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuseRoute'] || false;
  }

  // store route in memory
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (!route.routeConfig?.path || !handle) {
      return;
    }

    const id = this.createIdentifier(route);
    this.currentParentRoute = this.getFirstUrlSegment(route);
    this.storedRoutes.set(id, handle);
  }

  // if true calls retrieve
  // clears stored routes if first segment different
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (this.getFirstUrlSegment(route) !== this.currentParentRoute) {
      this.storedRoutes.clear();
    }

    return !!route.routeConfig && this.storedRoutes.has(this.createIdentifier(route));
  }

  // retrieve route if stored previously
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.routeConfig?.path) {
      return null;
    }

    const id = this.createIdentifier(route);
    return this.storedRoutes.get(id) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  // return first segment of current route (eg: tickets in tickets/form/111)
  private getFirstUrlSegment(route: ActivatedRouteSnapshot): string | null {
    const firstUrlSegmentMap = this.getUrlSegments(route).filter((v) => v.length > 0)[0];
    if (!firstUrlSegmentMap) {
      return null;
    }
    return firstUrlSegmentMap[0].path ?? null;
  }

  private getUrlSegments(route: ActivatedRouteSnapshot) {
    return route.pathFromRoot.map((u) => u.url);
  }

  // create unique identifier for every url
  private createIdentifier(route: ActivatedRouteSnapshot) {
    const segments = this.getUrlSegments(route);
    const subpaths = ([] as UrlSegment[]).concat(...segments).map((segment) => segment.path);

    // Result: ${route_depth}-${path}
    return segments.length + '-' + subpaths.join('/');
  }
}
