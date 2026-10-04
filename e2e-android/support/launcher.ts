export type LauncherBounds = { x: number; y: number; width: number; height: number };

export function launcherTileBounds(xml: string, name: string): LauncherBounds | undefined {
  const label = name
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const tile = xml
    .match(/<node\b[^>]*>/g)
    ?.find(
      (node) =>
        /package="[^"]*launcher[^"]*"/.test(node) &&
        (node.includes(`text="${label}"`) || node.includes(`content-desc="${label}"`)),
    );
  const coordinates = tile?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!coordinates) return undefined;
  const x = Number(coordinates[1]),
    y = Number(coordinates[2]);
  const width = Number(coordinates[3]) - x,
    height = Number(coordinates[4]) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
}

/** Each unsuccessful observation advances the drawer, including opening it from HOME. */
export async function findOrScrollLauncherTile(
  shell: (command: string) => Promise<Buffer>,
  name: string,
  screen: { width: number; height: number },
): Promise<LauncherBounds | undefined> {
  await shell('uiautomator dump /sdcard/woorden-launcher.xml');
  const xml = (await shell('cat /sdcard/woorden-launcher.xml')).toString();
  const bounds = launcherTileBounds(xml, name);
  if (!bounds) {
    const x = Math.round(screen.width / 2);
    await shell(
      `input swipe ${x} ${Math.round(screen.height * 0.85)} ${x} ${Math.round(screen.height * 0.2)} 250`,
    );
  }
  return bounds;
}
