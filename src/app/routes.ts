export const routes = ['today', 'study', 'library', 'progress', 'settings'] as const;
export type Route = (typeof routes)[number];

export function routeFromHash(hash: string): Route {
  return routes.find((route) => hash === `#/${route}`) ?? 'today';
}
