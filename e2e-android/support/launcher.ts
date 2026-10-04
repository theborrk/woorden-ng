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
  return nodeBounds(tile);
}

function nodeBounds(node: string | undefined): LauncherBounds | undefined {
  const coordinates = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!coordinates) return undefined;
  const x = Number(coordinates[1]),
    y = Number(coordinates[2]);
  const width = Number(coordinates[3]) - x,
    height = Number(coordinates[4]) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
}

function systemUiWaitBounds(xml: string): LauncherBounds | undefined {
  const nodes = xml.match(/<node\b[^>]*>/g) ?? [];
  const isSystemDialog = (node: string) => node.includes('package="android"');
  const interrupted = nodes.some(
    (node) => isSystemDialog(node) && node.includes(`text="System UI isn't responding"`),
  );
  return interrupted
    ? nodeBounds(nodes.find((node) => isSystemDialog(node) && node.includes('text="Wait"')))
    : undefined;
}

/** Recover the emulator's System UI dialog or advance the drawer until the real tile appears. */
export async function findOrScrollLauncherTile(
  shell: (command: string) => Promise<Buffer>,
  name: string,
  screen: { width: number; height: number },
): Promise<LauncherBounds | undefined> {
  const dump = await shell('uiautomator dump /sdcard/woorden-launcher.xml');
  const xml = (await shell('cat /sdcard/woorden-launcher.xml')).toString();
  if (!xml.includes('<hierarchy')) {
    throw new Error(`Launcher UI dump failed: ${dump.toString().trim()} ${xml.trim()}`);
  }
  // A cold emulator can show a System UI ANR modal over HOME. Wait keeps System UI running;
  // never dismiss an ANR belonging to the app under test or accept a tile behind the modal.
  const wait = systemUiWaitBounds(xml);
  if (wait) {
    await shell(
      `input tap ${Math.round(wait.x + wait.width / 2)} ${Math.round(wait.y + wait.height / 2)}`,
    );
    return undefined;
  }
  const bounds = launcherTileBounds(xml, name);
  if (!bounds) {
    const x = Math.round(screen.width / 2);
    await shell(
      `input swipe ${x} ${Math.round(screen.height * 0.85)} ${x} ${Math.round(screen.height * 0.2)} 250`,
    );
  }
  return bounds;
}
