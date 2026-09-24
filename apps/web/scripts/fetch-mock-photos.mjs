import { copyFile, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/products",
);

/** Stable Unsplash photos, one per product family. */
const photos = {
  headphones: "1505740420928-5e560c06d30e",
  keyboard: "1511467687858-23d96c32e4ae",
  mouse: "1527864550417-7fd91fc51a46",
  earbuds: "1590658268037-6bf12165a8df",
  webcam: "1587826080692-f439cd0b70da",
  speaker: "1608043152269-423dbba4e7e1",
  mic: "1590602847861-f357a9332bbc",
  drive: "1597872200969-2b65d56bd16b",
  cable: "1558618666-fcd25c85cd64",
  charger: "1583863788434-e58a36330cf0",
  bag: "1553062407-98eeb64c6a62",
  glasses: "1574258495973-f010dfbb5371",
  notebook: "1517842645767-c639042777db",
  lamp: "1507473885765-e6ed057f782c",
  monitor: "1527443224154-c4a3942d3acf",
  desk: "1593642632823-8f785ba67e45",
  stand: "1527443191895-9d0d5a0b0b0b",
  hub: "1625842268584-98e1c0e0c0c0",
  sd: "1601524909162-ae8721adae54",
  lock: "1582139329536-e7284fece509",
  tripod: "1516035069371-29a1b244cc32",
  pen: "1455390582262-044cdead277a",
  clean: "1585421514738-01798e348b17",
};

const groups = {
  headphones: ["headphones", "studio-headphones", "headphones-case"],
  keyboard: [
    "keyboard",
    "keyboard-full",
    "keyboard-low",
    "keyboard-wireless",
    "keycaps",
    "switches",
    "keyboard-cover",
    "keypad",
  ],
  mouse: [
    "mouse",
    "mouse-vertical",
    "mouse-gaming",
    "trackball",
    "mouse-pad",
    "mouse-bungee",
    "wrist-rest",
    "wrist-mouse",
  ],
  earbuds: ["earbuds"],
  webcam: ["webcam", "document-camera"],
  speaker: ["speaker"],
  mic: ["microphone", "audio-interface", "dac"],
  drive: ["ssd", "ssd-2tb", "ssd-512", "hdd", "flash-128", "flash-64", "nvme"],
  cable: [
    "cable",
    "cable-1m",
    "cable-3m",
    "hdmi",
    "hdmi-1m",
    "hdmi-5m",
    "displayport",
    "ethernet-cable",
    "extension",
    "coiled-cable",
    "cable-kit",
    "raceway",
  ],
  charger: [
    "charger",
    "charger-100w",
    "charger-30w",
    "charging-pad",
    "power-bank",
    "power-bank-10k",
    "surge",
    "power-strip",
    "travel-adapter",
  ],
  bag: ["sleeve", "sleeve-16", "messenger", "backpack", "laptop-skin"],
  glasses: ["glasses"],
  notebook: ["notebook", "sticky-notes", "whiteboard", "organizer"],
  lamp: ["light-bar", "ring-light", "desk-lamp"],
  monitor: ["portable-monitor", "privacy-screen", "privacy-filter", "privacy"],
  desk: ["desk-mat", "cooling-pad", "footrest", "desk-shelf"],
  stand: [
    "stand",
    "tablet-stand",
    "phone-stand",
    "headset-stand",
    "monitor-arm",
    "monitor-arm-dual",
    "monitor-riser",
  ],
  hub: ["hub", "hub-mini", "hub-usb3", "dock", "ethernet", "card-reader", "presenter"],
  sd: ["sd-card", "microsd", "sd-256", "sd-64"],
  lock: ["laptop-lock"],
  tripod: ["tripod", "tablet"],
  pen: ["pens", "label-maker"],
  clean: ["cleaning-kit", "duster"],
};

const fallbacks = {
  stand: "1593642632823-8f785ba67e45",
  hub: "1517336714731-489689fd1ca8",
  sd: "1516035069371-29a1b244cc32",
  lock: "1558618666-fcd25c85cd64",
  drive: "1531492746076-161ca1b3d83a",
};

async function download(id) {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=800&q=70`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${id} -> ${response.status}`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    throw new Error(`${id} -> ${type}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 4000) {
    throw new Error(`${id} -> too small`);
  }
  return bytes;
}

await mkdir(root, { recursive: true });
const cache = new Map();

for (const [family, slugs] of Object.entries(groups)) {
  let bytes;
  try {
    bytes = await download(photos[family]);
  } catch (error) {
    const backup = fallbacks[family];
    if (!backup) {
      throw error;
    }
    console.warn(`fallback ${family}: ${error.message}`);
    bytes = await download(backup);
  }
  cache.set(family, bytes);
  const source = path.join(root, `.${family}.jpg`);
  await writeFile(source, bytes);
  for (const slug of slugs) {
    await copyFile(source, path.join(root, `${slug}.jpg`));
  }
  await unlink(source);
  console.log(`${family}: ${slugs.length}`);
}
