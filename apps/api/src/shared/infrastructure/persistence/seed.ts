import "reflect-metadata";
import { AppDataSource } from "./typeorm.data-source.js";
import { InventoryOrmEntity } from "#modules/inventory/infrastructure/typeorm/inventory.orm-entity.js";
import { ProductOrmEntity } from "#modules/catalog/infrastructure/typeorm/product.orm-entity.js";

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: number;
};

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "Wireless Headphones",
    description:
      "Over-ear wireless headphones with hybrid active noise cancellation, 40 mm drivers and up to 30 hours of battery. The ear cups fold flat, the headband is padded, and a USB-C cable plus a hard travel case are included.",
    price: 299900,
    imageUrl: "/products/headphones.svg",
    available: 10,
  },
  {
    name: "Mechanical Keyboard",
    description:
      "75% hot-swap mechanical keyboard with gasket mount, PBT keycaps and south-facing RGB. It connects over USB-C or Bluetooth to three devices and ships with a coiled cable and a switch puller.",
    price: 189900,
    imageUrl: "/products/keyboard.svg",
    available: 15,
  },
  {
    name: "USB-C Hub",
    description:
      "7-in-1 aluminum USB-C hub with HDMI 4K at 60 Hz, gigabit Ethernet, two USB-A 3.0 ports, SD and microSD readers, and 100 W pass-through charging. It runs cool enough to leave plugged into a laptop all day.",
    price: 99900,
    imageUrl: "/products/hub.svg",
    available: 25,
  },
  {
    name: "Laptop Stand",
    description:
      "Foldable aluminum laptop stand that raises a 11 to 16 inch notebook to eye level. Six height steps, a silicone contact strip, and a weight under 1 kg make it easy to carry between desk and meeting room.",
    price: 129900,
    imageUrl: "/products/stand.svg",
    available: 20,
  },
  {
    name: "Wireless Mouse",
    description:
      "Ergonomic wireless mouse with silent switches, a 1600 DPI optical sensor and a USB-C rechargeable battery that lasts about six weeks. It pairs by 2.4 GHz dongle or Bluetooth and works on glass.",
    price: 79900,
    imageUrl: "/products/mouse.svg",
    available: 30,
  },
  {
    name: "Noise-Cancelling Earbuds",
    description:
      "In-ear buds with adaptive noise cancellation, transparency mode and multipoint Bluetooth 5.3. Each charge lasts 8 hours and the case adds 24 more; IPX4 sweat resistance covers commutes and workouts.",
    price: 249900,
    imageUrl: "/products/earbuds.svg",
    available: 18,
  },
  {
    name: "USB Condenser Microphone",
    description:
      "Cardioid USB-C condenser mic for calls and voice notes, with a mute button, gain knob and a shock-mounted stand. It records at 24-bit / 48 kHz and needs no extra interface on Windows or macOS.",
    price: 159900,
    imageUrl: "/products/microphone.svg",
    available: 12,
  },
  {
    name: "Bluetooth Speaker",
    description:
      "Portable Bluetooth 5.3 speaker with 20 W output, a passive radiator and 12 hours of playback. It is IPX7 waterproof, pairs in stereo with a second unit, and charges by USB-C.",
    price: 139900,
    imageUrl: "/products/speaker.svg",
    available: 22,
  },
  {
    name: "Full HD Webcam",
    description:
      "1080p webcam at 30 fps with a dual-mic array, automatic low-light correction and a privacy shutter. The clip fits monitors from 15 to 32 inches and the USB-A cable works without drivers.",
    price: 179900,
    imageUrl: "/products/webcam.svg",
    available: 14,
  },
  {
    name: "Monitor Arm",
    description:
      "Single gas-spring monitor arm for screens from 17 to 32 inches and up to 9 kg. It clamps or grommets to the desk, offers tilt, swivel and 360° rotation, and hides cables inside the arm.",
    price: 219900,
    imageUrl: "/products/monitor-arm.svg",
    available: 8,
  },
  {
    name: "Portable SSD 1 TB",
    description:
      "1 TB USB-C portable SSD with read speeds up to 1050 MB/s and a rubberized shell rated for a 2 m drop. It is bus-powered, works with USB 3.2 and Thunderbolt, and includes a short USB-C cable.",
    price: 329900,
    imageUrl: "/products/ssd.svg",
    available: 16,
  },
  {
    name: "USB-C Cable 2 m",
    description:
      "Braided 2 m USB-C to USB-C cable rated for 100 W and 10 Gbps data. Reinforced plugs, an e-marker chip and a lifetime strain-relief design suit daily laptop charging.",
    price: 39900,
    imageUrl: "/products/cable.svg",
    available: 80,
  },
  {
    name: "GaN Charger 65W",
    description:
      "65 W GaN wall charger with two USB-C ports and one USB-A port. It is small enough for a pocket, supports PPS for compatible phones, and includes fold-flat prongs.",
    price: 149900,
    imageUrl: "/products/charger.svg",
    available: 28,
  },
  {
    name: "Laptop Sleeve 14 in",
    description:
      "14 inch sleeve in water-resistant recycled polyester with a soft microfiber lining and a front pocket for a charger. A magnetic flap keeps the laptop in place inside a backpack.",
    price: 89900,
    imageUrl: "/products/sleeve.svg",
    available: 35,
  },
  {
    name: "Desk Mat XL",
    description:
      "900 × 400 mm desk mat in stitched PU leather with a non-slip natural rubber base. It covers keyboard and mouse, lies flat, and wipes clean with a damp cloth.",
    price: 69900,
    imageUrl: "/products/desk-mat.svg",
    available: 40,
  },
  {
    name: "Monitor Light Bar",
    description:
      "Asymmetric LED light bar that clips to monitors up to 32 inches and lights the desk without glare on the screen. Three color temperatures, stepless dimming and a USB-C power lead.",
    price: 189900,
    imageUrl: "/products/light-bar.svg",
    available: 11,
  },
  {
    name: "Ergonomic Wrist Rest",
    description:
      "Memory-foam wrist rest with a washable bamboo cover, sized for a tenkeyless keyboard. The slow-rebound foam keeps wrists neutral during long typing sessions.",
    price: 49900,
    imageUrl: "/products/wrist-rest.svg",
    available: 45,
  },
  {
    name: "HDMI Cable 2 m",
    description:
      "Certified 2 m HDMI 2.1 cable for 4K at 120 Hz and 8K at 60 Hz, with ethernet and eARC. Braided jacket and gold-plated connectors for a monitor, TV or docking station.",
    price: 34900,
    imageUrl: "/products/hdmi.svg",
    available: 60,
  },
  {
    name: "Thunderbolt Dock",
    description:
      "Thunderbolt 4 dock with 96 W host charging, dual 4K display output, gigabit Ethernet and four USB ports. One cable connects a laptop to the whole desk setup.",
    price: 459900,
    imageUrl: "/products/dock.svg",
    available: 7,
  },
  {
    name: "Trackball Mouse",
    description:
      "Finger-operated trackball with a 34 mm ball, two thumb buttons and a precision scroll ring. It stays put on a small desk and connects by Bluetooth or the included 2.4 GHz receiver.",
    price: 169900,
    imageUrl: "/products/trackball.svg",
    available: 9,
  },
  {
    name: "Numeric Keypad",
    description:
      "Bluetooth numeric keypad with scissor switches, a large enter key and a switch for a second paired device. Recharges by USB-C and covers spreadsheets when the main keyboard is compact.",
    price: 79900,
    imageUrl: "/products/keypad.svg",
    available: 20,
  },
  {
    name: "Webcam Privacy Covers",
    description:
      "Pack of six sliding privacy covers that stick to laptop and monitor webcams from 2 to 7 mm thick. They close flush, leave no residue, and fit ultrathin bezels.",
    price: 19900,
    imageUrl: "/products/privacy.svg",
    available: 100,
  },
  {
    name: "Cable Management Kit",
    description:
      "Kit with 20 reusable velcro ties, 10 adhesive clips, 4 sleeves and a cable box. It organizes a desk or TV stand without tools and the ties wrap cables up to 15 mm thick.",
    price: 44900,
    imageUrl: "/products/cable-kit.svg",
    available: 32,
  },
  {
    name: "Portable Monitor 15.6 in",
    description:
      "15.6 inch IPS portable monitor at 1920×1080, 60 Hz, with mini-HDMI and USB-C display input. A smart cover folds into a stand and one USB-C cable can carry video and power.",
    price: 899900,
    imageUrl: "/products/portable-monitor.svg",
    available: 5,
  },
  {
    name: "Drawing Tablet",
    description:
      "10 × 6 inch battery-free drawing tablet with 8192 pressure levels, a tilt-sensitive pen and eight express keys. It works over USB-C with Windows and macOS and includes extra nibs.",
    price: 549900,
    imageUrl: "/products/tablet.svg",
    available: 6,
  },
  {
    name: "Headset Stand",
    description:
      "Aluminum headset stand with a weighted base, a hook that fits most over-ear headsets, and two USB 3.0 ports plus a 3.5 mm passthrough at the base.",
    price: 59900,
    imageUrl: "/products/headset-stand.svg",
    available: 24,
  },
  {
    name: "Surge Protector",
    description:
      "8-outlet surge protector with 2100 joules of protection, two USB-C ports at 20 W total and a 2 m cord. A spaced outlet fits bulky adapters and an indicator shows ground and protection status.",
    price: 89900,
    imageUrl: "/products/surge.svg",
    available: 18,
  },
  {
    name: "Wireless Presenter",
    description:
      "Presentation remote with laser pointer, volume and black-screen keys, and a 20 m 2.4 GHz range. The USB receiver stores inside the body and a single AAA cell is included.",
    price: 74900,
    imageUrl: "/products/presenter.svg",
    available: 13,
  },
  {
    name: "SD Card 128 GB",
    description:
      "128 GB UHS-I SDXC card rated V30 and U3, with read speeds up to 170 MB/s. It records 4K video, includes an SD adapter, and is water, temperature and X-ray resistant.",
    price: 54900,
    imageUrl: "/products/sd-card.svg",
    available: 50,
  },
  {
    name: "Laptop Cooling Pad",
    description:
      "Cooling pad with five quiet fans, six height angles and two USB-A passthrough ports. The mesh surface fits laptops up to 17 inches and a single USB plug powers the fans.",
    price: 109900,
    imageUrl: "/products/cooling-pad.svg",
    available: 17,
  },
  {
    name: "Laptop Backpack",
    description:
      "20 L backpack with a padded 16 inch laptop sleeve, a tablet pocket and a water-resistant coated fabric. The sternum strap and rear luggage pass-through suit a commute or a short flight.",
    price: 199900,
    imageUrl: "/products/backpack.svg",
    available: 14,
  },
  {
    name: "Power Bank 20000 mAh",
    description:
      "20,000 mAh power bank with 65 W USB-C output, a second USB-C port and USB-A. It charges a laptop and a phone together, shows remaining charge on an LED bar, and fits in a carry-on.",
    price: 189900,
    imageUrl: "/products/power-bank.svg",
    available: 19,
  },
  {
    name: "Studio Headphones",
    description:
      "Closed-back wired studio headphones with 50 mm drivers, a detachable 3 m cable and a coiled 1.2 m cable. Replaceable ear pads and a flat frequency response suit editing and monitoring.",
    price: 349900,
    imageUrl: "/products/studio-headphones.svg",
    available: 4,
  },
  {
    name: "Full-size Mechanical Keyboard",
    description:
      "Full-size mechanical keyboard with a number pad, hot-swap sockets, dye-sublimated PBT keycaps and a USB-C detachable cable. Stabilizers come pre-lubed and the case is matte black aluminum.",
    price: 259900,
    imageUrl: "/products/keyboard-full.svg",
    available: 9,
  },
  {
    name: "Cloth Mouse Pad",
    description:
      "450 × 400 mm cloth mouse pad with a 3 mm rubber base and stitched edges that resist fraying. The surface tracks optical and laser sensors and stays flat on wood or glass desks.",
    price: 29900,
    imageUrl: "/products/mouse-pad.svg",
    available: 70,
  },
  {
    name: "USB-C Ethernet Adapter",
    description:
      "USB-C to gigabit Ethernet adapter in an aluminum housing, bus-powered and driver-free on current Windows, macOS and Linux. A short captive cable keeps it in a laptop bag.",
    price: 59900,
    imageUrl: "/products/ethernet.svg",
    available: 26,
  },
  {
    name: "Document Camera",
    description:
      "8 megapixel document camera with autofocus, an LED fill light and a folding arm that covers A3 pages. USB-C output works as a webcam for classes, and a snapshot button saves stills.",
    price: 429900,
    imageUrl: "/products/document-camera.svg",
    available: 3,
  },
  {
    name: "USB-C Hub Mini",
    description:
      "Pocket USB-C hub with HDMI, USB-A 3.0 and USB-C power delivery up to 100 W. It is about the size of a matchbox and adds a second screen without a full dock.",
    price: 64900,
    imageUrl: "/products/hub-mini.svg",
    available: 1,
  },
  {
    name: "Mechanical Keyboard Switches",
    description:
      "Pack of 90 tactile mechanical switches, 3-pin and 5-pin, factory lubed and rated for 50 million clicks. They drop into any hot-swap MX-style board.",
    price: 119900,
    imageUrl: "/products/switches.svg",
    available: 0,
  },
  {
    name: "USB-C Cable 1 m",
    description:
      "Braided 1 m USB-C to USB-C cable rated for 100 W and 10 Gbps. Short enough for a desk charger, with reinforced plugs and an e-marker chip.",
    price: 29900,
    imageUrl: "/products/cable-1m.svg",
    available: 90,
  },
  {
    name: "USB-C Cable 3 m",
    description:
      "Braided 3 m USB-C to USB-C cable for 100 W charging and 10 Gbps data. It reaches from a wall outlet to a sofa or a standing desk without a second extension.",
    price: 49900,
    imageUrl: "/products/cable-3m.svg",
    available: 55,
  },
  {
    name: "HDMI Cable 1 m",
    description:
      "Certified 1 m HDMI 2.1 cable for 4K at 120 Hz, with a slim head that fits tight ports behind a monitor. Braided jacket and gold-plated contacts.",
    price: 27900,
    imageUrl: "/products/hdmi-1m.svg",
    available: 70,
  },
  {
    name: "HDMI Cable 5 m",
    description:
      "Active 5 m HDMI 2.1 cable that holds 4K at 60 Hz over the full length. Use it between a desk dock and a wall-mounted screen.",
    price: 79900,
    imageUrl: "/products/hdmi-5m.svg",
    available: 22,
  },
  {
    name: "DisplayPort Cable 2 m",
    description:
      "2 m DisplayPort 1.4 cable for 8K at 60 Hz or 4K at 144 Hz, with a latching connector. It links a desktop GPU to a high-refresh monitor.",
    price: 54900,
    imageUrl: "/products/displayport.svg",
    available: 34,
  },
  {
    name: "Braided Ethernet Cable 3 m",
    description:
      "Cat6a 3 m patch cable in a braided jacket, rated for 10 Gbps. Snagless boots and a flat strain relief keep it tidy between a dock and a switch.",
    price: 32900,
    imageUrl: "/products/ethernet-cable.svg",
    available: 48,
  },
  {
    name: "Portable SSD 2 TB",
    description:
      "2 TB USB-C portable SSD with reads up to 1050 MB/s and a rubber shell rated for a 2 m drop. Bus-powered, with a short USB-C cable in the box.",
    price: 549900,
    imageUrl: "/products/ssd-2tb.svg",
    available: 8,
  },
  {
    name: "Portable SSD 512 GB",
    description:
      "512 GB USB-C portable SSD for project files and backups, with reads up to 1000 MB/s. Pocket-sized aluminum case, bus-powered.",
    price: 219900,
    imageUrl: "/products/ssd-512.svg",
    available: 21,
  },
  {
    name: "USB Flash Drive 128 GB",
    description:
      "128 GB USB 3.2 flash drive with a swivel cap and read speeds up to 200 MB/s. A metal body and a keyring hole make it easy to carry.",
    price: 44900,
    imageUrl: "/products/flash-128.svg",
    available: 64,
  },
  {
    name: "USB Flash Drive 64 GB",
    description:
      "64 GB USB 3.2 flash drive with a retractable connector and read speeds up to 150 MB/s. Small enough to leave on a keychain.",
    price: 29900,
    imageUrl: "/products/flash-64.svg",
    available: 80,
  },
  {
    name: "microSD Card 256 GB",
    description:
      "256 GB microSDXC card rated A2 and V30, with an SD adapter in the pack. It handles 4K video and app storage on phones and handhelds.",
    price: 89900,
    imageUrl: "/products/microsd.svg",
    available: 40,
  },
  {
    name: "SD Card 256 GB",
    description:
      "256 GB UHS-I SDXC card rated V30, with reads up to 180 MB/s. Built for 4K photo bursts and long video takes.",
    price: 99900,
    imageUrl: "/products/sd-256.svg",
    available: 28,
  },
  {
    name: "SD Card 64 GB",
    description:
      "64 GB UHS-I SDXC card rated V30 for full HD and light 4K recording. Includes a plastic case and a write-protect switch.",
    price: 34900,
    imageUrl: "/products/sd-64.svg",
    available: 52,
  },
  {
    name: "NVMe Enclosure",
    description:
      "USB-C 10 Gbps enclosure for M.2 NVMe SSDs from 2230 to 2280. Tool-free lid, aluminum heatsink shell, and a 20 cm USB-C cable.",
    price: 89900,
    imageUrl: "/products/nvme.svg",
    available: 18,
  },
  {
    name: "External HDD 2 TB",
    description:
      "2 TB USB 3.0 external hard drive for archives and backups. It is bus-powered, spins down when idle, and includes a short USB-A cable.",
    price: 249900,
    imageUrl: "/products/hdd.svg",
    available: 12,
  },
  {
    name: "Wireless Keyboard",
    description:
      "Full-size wireless keyboard with scissor switches, a number pad and a 2.4 GHz receiver that stores under the board. Two AA cells last about a year.",
    price: 119900,
    imageUrl: "/products/keyboard-wireless.svg",
    available: 16,
  },
  {
    name: "Low-profile Mechanical Keyboard",
    description:
      "Low-profile 75% mechanical keyboard with quiet switches, white backlight and Bluetooth plus USB-C. It is thin enough to travel in a laptop sleeve.",
    price: 279900,
    imageUrl: "/products/keyboard-low.svg",
    available: 7,
  },
  {
    name: "Ergonomic Vertical Mouse",
    description:
      "Vertical wireless mouse that holds the hand in a handshake grip. Silent clicks, a thumb rest and a rechargeable battery of about six weeks.",
    price: 129900,
    imageUrl: "/products/mouse-vertical.svg",
    available: 15,
  },
  {
    name: "Compact Gaming Mouse",
    description:
      "Lightweight wired mouse at 59 g with a 26K optical sensor, six buttons and a flexible paracord cable. PTFE feet and onboard DPI steps.",
    price: 159900,
    imageUrl: "/products/mouse-gaming.svg",
    available: 11,
  },
  {
    name: "Dual Monitor Arm",
    description:
      "Dual gas-spring arm for two screens from 17 to 32 inches, up to 9 kg each. Clamp or grommet mount, full tilt and cable channels in both arms.",
    price: 389900,
    imageUrl: "/products/monitor-arm-dual.svg",
    available: 4,
  },
  {
    name: "Monitor Riser",
    description:
      "Bamboo monitor riser that lifts a screen or laptop about 10 cm and leaves a shelf for a keyboard. Holds up to 15 kg and assembles without tools.",
    price: 79900,
    imageUrl: "/products/monitor-riser.svg",
    available: 23,
  },
  {
    name: "Laptop Lock",
    description:
      "Keyed laptop lock with a 1.8 m vinyl-coated steel cable and a standard security slot. Two keys are included and the lock head rotates 360°.",
    price: 69900,
    imageUrl: "/products/laptop-lock.svg",
    available: 27,
  },
  {
    name: "USB 3.0 Hub",
    description:
      "Four-port USB 3.0 hub in aluminum, bus-powered, with a 30 cm captive cable. Each port supplies enough current for a flash drive, receiver or card reader.",
    price: 54900,
    imageUrl: "/products/hub-usb3.svg",
    available: 36,
  },
  {
    name: "GaN Charger 100W",
    description:
      "100 W GaN charger with three USB-C ports and one USB-A port. It can run a laptop at full speed and still charge a phone from a second port.",
    price: 199900,
    imageUrl: "/products/charger-100w.svg",
    available: 13,
  },
  {
    name: "GaN Charger 30W",
    description:
      "30 W USB-C GaN charger the size of a wall wart, with PPS for compatible phones. Fold-flat prongs and a single port for a nightstand or travel kit.",
    price: 69900,
    imageUrl: "/products/charger-30w.svg",
    available: 42,
  },
  {
    name: "Wireless Charging Pad",
    description:
      "15 W Qi wireless charging pad with a soft top, foreign-object detection and a USB-C input. A 1 m cable is included; the charger brick is not.",
    price: 59900,
    imageUrl: "/products/charging-pad.svg",
    available: 31,
  },
  {
    name: "Power Strip",
    description:
      "Four-outlet power strip with two USB-C ports, a 1.5 m cord and a flat plug. Spaced sockets leave room for bulky adapters.",
    price: 74900,
    imageUrl: "/products/power-strip.svg",
    available: 29,
  },
  {
    name: "Travel Power Adapter",
    description:
      "Universal travel adapter for US, UK, EU and AU sockets, with two USB-C ports at 30 W combined and one USB-A. A fuse is user-replaceable.",
    price: 89900,
    imageUrl: "/products/travel-adapter.svg",
    available: 20,
  },
  {
    name: "Power Bank 10000 mAh",
    description:
      "10,000 mAh power bank at 30 W USB-C, slim enough for a jacket pocket. It recharges a phone about twice and shows charge on four LEDs.",
    price: 109900,
    imageUrl: "/products/power-bank-10k.svg",
    available: 24,
  },
  {
    name: "Laptop Sleeve 16 in",
    description:
      "16 inch sleeve in water-resistant polyester with a fleece lining and a front slip pocket. Fits most 16 inch laptops with a thin skin, not a thick case.",
    price: 99900,
    imageUrl: "/products/sleeve-16.svg",
    available: 26,
  },
  {
    name: "Messenger Bag",
    description:
      "12 L messenger with a padded 14 inch laptop pocket, a flap closure and an adjustable shoulder strap. Waxed canvas exterior and a grab handle on top.",
    price: 229900,
    imageUrl: "/products/messenger.svg",
    available: 9,
  },
  {
    name: "Desk Organizer",
    description:
      "Bamboo desk organizer with slots for pens, a phone and a small notebook, plus a tray for paper clips. It sits flat and wipes clean.",
    price: 64900,
    imageUrl: "/products/organizer.svg",
    available: 33,
  },
  {
    name: "Desk Lamp",
    description:
      "LED desk lamp with a hinged arm, five brightness steps and three color temperatures. The base hides a wireless charging pad and a USB-A port.",
    price: 159900,
    imageUrl: "/products/desk-lamp.svg",
    available: 10,
  },
  {
    name: "Screen Cleaning Kit",
    description:
      "Kit with a 100 ml screen spray, two microfiber cloths and a soft brush. The fluid is alcohol-free and safe for laptop, monitor and phone glass.",
    price: 24900,
    imageUrl: "/products/cleaning-kit.svg",
    available: 75,
  },
  {
    name: "Compressed Air Duster",
    description:
      "Rechargeable electric duster with a 60-minute runtime and a narrow nozzle for keyboards and vents. USB-C charging replaces disposable cans.",
    price: 139900,
    imageUrl: "/products/duster.svg",
    available: 14,
  },
  {
    name: "Keyboard Cover",
    description:
      "Clear silicone cover for full-size laptop keyboards, washable and thin enough that key travel stays close to stock. It peels off without residue.",
    price: 19900,
    imageUrl: "/products/keyboard-cover.svg",
    available: 60,
  },
  {
    name: "Mouse Bungee",
    description:
      "Spring-arm mouse bungee with a weighted metal base and an adjustable clamp for the cable. It keeps a wired mouse cord off the pad.",
    price: 44900,
    imageUrl: "/products/mouse-bungee.svg",
    available: 19,
  },
  {
    name: "Keycap Set",
    description:
      "104-key PBT doubleshot keycap set in a Cherry profile, with extras for ISO enter and a 6.25u spacebar. Thick walls and a matte finish.",
    price: 149900,
    imageUrl: "/products/keycaps.svg",
    available: 8,
  },
  {
    name: "Coiled USB Cable",
    description:
      "Coiled USB-C to USB-A aviator cable, about 1.5 m extended, with a detachable coil and gold-plated connectors. Made for a keyboard on a desk.",
    price: 79900,
    imageUrl: "/products/coiled-cable.svg",
    available: 17,
  },
  {
    name: "USB-C DAC",
    description:
      "Compact USB-C headphone DAC with a 3.5 mm output, up to 32-bit / 384 kHz playback and hardware volume buttons. It draws power from the phone or laptop.",
    price: 119900,
    imageUrl: "/products/dac.svg",
    available: 13,
  },
  {
    name: "USB Audio Interface",
    description:
      "Two-input USB-C audio interface with combo jacks, 48 V phantom power and direct monitoring. It records at 24-bit / 192 kHz and includes a USB-C cable.",
    price: 399900,
    imageUrl: "/products/audio-interface.svg",
    available: 5,
  },
  {
    name: "Ring Light",
    description:
      "10 inch LED ring light on a desktop stand, with a phone clamp and stepless dimming from warm to cool. USB-C powered, tripod thread on the base.",
    price: 129900,
    imageUrl: "/products/ring-light.svg",
    available: 16,
  },
  {
    name: "Mini Tripod",
    description:
      "Tabletop tripod that extends from 15 to 35 cm, with a ball head and a phone clamp. The legs fold around the center column for a pocket kit.",
    price: 49900,
    imageUrl: "/products/tripod.svg",
    available: 30,
  },
  {
    name: "Phone Stand",
    description:
      "Aluminum phone stand with an adjustable angle and a weighted base. It holds phones in portrait or landscape and leaves a gap for a charging cable.",
    price: 39900,
    imageUrl: "/products/phone-stand.svg",
    available: 44,
  },
  {
    name: "Tablet Stand",
    description:
      "Foldable tablet stand in aluminum for devices from 8 to 13 inches. Three angles, a silicone lip, and a weight under 300 g.",
    price: 69900,
    imageUrl: "/products/tablet-stand.svg",
    available: 21,
  },
  {
    name: "Blue Light Glasses",
    description:
      "Blue-light filter glasses with clear lenses, a light TR90 frame and a hard case. They sit over most contact lenses and come with a cleaning cloth.",
    price: 79900,
    imageUrl: "/products/glasses.svg",
    available: 25,
  },
  {
    name: "Footrest",
    description:
      "Adjustable footrest with a textured platform and three height locks. A non-slip base keeps it in place under a desk.",
    price: 109900,
    imageUrl: "/products/footrest.svg",
    available: 12,
  },
  {
    name: "Cable Raceway",
    description:
      "1 m adhesive cable raceway in white plastic, split so cables drop in without threading. End caps and mounting tape are in the kit.",
    price: 34900,
    imageUrl: "/products/raceway.svg",
    available: 38,
  },
  {
    name: "Laptop Privacy Screen",
    description:
      "14 inch privacy filter that blacks out the panel beyond about 30° to each side. It sticks with adhesive tabs or a slide mount and peels off clean.",
    price: 89900,
    imageUrl: "/products/privacy-screen.svg",
    available: 18,
  },
  {
    name: "USB-C Card Reader",
    description:
      "USB-C reader for SD and microSD at UHS-I speeds, aluminum body, bus-powered. A short captive cable and a cap keep it in a camera bag.",
    price: 44900,
    imageUrl: "/products/card-reader.svg",
    available: 27,
  },
  {
    name: "Label Maker",
    description:
      "Handheld label maker with a QWERTY keyboard, a backlit screen and laminated tape that resists water and fading. One black-on-white cartridge is included.",
    price: 179900,
    imageUrl: "/products/label-maker.svg",
    available: 6,
  },
  {
    name: "Pen Set",
    description:
      "Set of eight gel pens in black, blue and six colors, 0.5 mm tips, with a cardboard sleeve. Ink is quick-dry and the grip is rubberized.",
    price: 24900,
    imageUrl: "/products/pens.svg",
    available: 85,
  },
  {
    name: "Notebook A5",
    description:
      "A5 hardcover notebook with 192 dotted pages, 100 gsm paper that holds fountain-pen ink, an elastic band and a ribbon marker.",
    price: 39900,
    imageUrl: "/products/notebook.svg",
    available: 46,
  },
  {
    name: "Sticky Notes",
    description:
      "Pack of 12 sticky-note pads in six colors, 76 × 76 mm, 100 sheets each. The adhesive releases cleanly from monitors and paper.",
    price: 18900,
    imageUrl: "/products/sticky-notes.svg",
    available: 100,
  },
  {
    name: "Desktop Whiteboard",
    description:
      "Desktop glass whiteboard, 30 × 20 cm, on a stand that also lies flat. Two markers, an eraser and a wall-mount option are included.",
    price: 59900,
    imageUrl: "/products/whiteboard.svg",
    available: 15,
  },
  {
    name: "Headphones Case",
    description:
      "Hard-shell case shaped for over-ear headphones, with a zip, a mesh pocket and dense foam that holds the ear cups. The shell is water-resistant.",
    price: 69900,
    imageUrl: "/products/headphones-case.svg",
    available: 20,
  },
  {
    name: "Laptop Skin",
    description:
      "Matte vinyl skin for a 14 inch laptop lid, precision-cut and residue-free. It hides scratches and comes with a squeegee and a dust cloth.",
    price: 34900,
    imageUrl: "/products/laptop-skin.svg",
    available: 32,
  },
  {
    name: "USB-C Extension Cable",
    description:
      "0.5 m USB-C extension, male to female, rated for 10 Gbps and 100 W. It brings a buried port to the front of a monitor or desk.",
    price: 29900,
    imageUrl: "/products/extension.svg",
    available: 41,
  },
  {
    name: "Monitor Privacy Filter",
    description:
      "24 inch privacy filter for 16:9 monitors, with side tabs that hang on the bezel. The view narrows to the person sitting in front of the screen.",
    price: 149900,
    imageUrl: "/products/privacy-filter.svg",
    available: 9,
  },
  {
    name: "Desk Shelf",
    description:
      "Two-tier desk shelf in powder-coated steel that stacks a monitor riser, a notebook and small supplies. Rubber feet protect the desktop.",
    price: 119900,
    imageUrl: "/products/desk-shelf.svg",
    available: 11,
  },
  {
    name: "Wrist Rest for Mouse",
    description:
      "Memory-foam wrist rest sized for a mouse hand, with a washable cover and a non-slip base. It matches the keyboard rest and sits flush with a cloth pad.",
    price: 34900,
    imageUrl: "/products/wrist-mouse.svg",
    available: 37,
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (manager) => {
      for (const item of SEED_PRODUCTS) {
        let product = await manager.findOne(ProductOrmEntity, {
          where: { name: item.name },
        });

        if (!product) {
          product = manager.create(ProductOrmEntity, {
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
          });
          product = await manager.save(product);
        } else {
          product.description = item.description;
          product.price = item.price;
          product.imageUrl = item.imageUrl;
          product = await manager.save(product);
        }

        let inventory = await manager.findOne(InventoryOrmEntity, {
          where: { productId: product.id },
        });

        if (!inventory) {
          inventory = manager.create(InventoryOrmEntity, {
            productId: product.id,
            available: item.available,
          });
        } else {
          inventory.available = item.available;
        }

        await manager.save(inventory);
      }
    });

    console.log(`Seeded ${SEED_PRODUCTS.length} products`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
