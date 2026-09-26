import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick, type App } from "vue";
import UiProductImage from "./UiProductImage.vue";

type MountProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

function mountImage(props: MountProps): {
  app: App;
  img: HTMLImageElement;
} {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(UiProductImage, props);
  app.mount(host);
  const img = host.querySelector("img");
  if (!img) {
    throw new Error("expected img element");
  }
  return { app, img };
}

describe("UiProductImage", () => {
  const apps: App[] = [];

  afterEach(() => {
    for (const app of apps) {
      app.unmount();
    }
    apps.length = 0;
    document.body.innerHTML = "";
  });

  it("uses lazy loading when priority is omitted", () => {
    const { app, img } = mountImage({
      src: "/images/lamp.jpg",
      alt: "Lamp",
    });
    apps.push(app);

    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("fetchpriority")).toBe("auto");
  });

  it("uses lazy loading when priority is false", () => {
    const { app, img } = mountImage({
      src: "/images/lamp.jpg",
      alt: "Lamp",
      priority: false,
    });
    apps.push(app);

    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("fetchpriority")).toBe("auto");
  });

  it("uses eager high-priority loading when priority is true", () => {
    const { app, img } = mountImage({
      src: "/images/lamp.jpg",
      alt: "Lamp",
      priority: true,
    });
    apps.push(app);

    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });

  it("falls back from jpg to the corresponding svg on error", async () => {
    const { app, img } = mountImage({
      src: "/images/lamp.jpg",
      alt: "Lamp",
    });
    apps.push(app);

    expect(img.getAttribute("src")).toBe("/images/lamp.jpg");

    img.dispatchEvent(new Event("error"));
    await nextTick();

    expect(img.getAttribute("src")).toBe("/images/lamp.svg");
  });
});
