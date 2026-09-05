import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ShellAppProps } from "shell";
import { AppLayout } from "shell";
import { RocketRideClient, type PipelineConfig } from "rocketride";
import QRCode from "qrcode";
import processVideoPipeline from "./process-video.pipe";
import processInstructionsPipeline from "./process-instructions.pipe";
import "./styles.css";
import "./pages.css";

type IconName =
  | "grid"
  | "book"
  | "team"
  | "check"
  | "settings"
  | "spark"
  | "plus"
  | "search"
  | "clock"
  | "play"
  | "qr"
  | "globe"
  | "more"
  | "upload"
  | "close"
  | "minus";
const Icon = ({ name, size = 18 }: { name: IconName; size?: number }) => {
  const p: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9" />
      </>
    ),
    check: (
      <>
        <path d="m9 11 3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 15l2 2-4 4-2-2M9 5 7 3 3 7l2 2M3 12h3M18 12h3M12 3v3M12 18v3" />
      </>
    ),
    spark: (
      <path d="m12 3-1.3 3.8a5.7 5.7 0 0 1-3.9 3.9L3 12l3.8 1.3a5.7 5.7 0 0 1 3.9 3.9L12 21l1.3-3.8a5.7 5.7 0 0 1 3.9-3.9L21 12l-3.8-1.3a5.7 5.7 0 0 1-3.9-3.9L12 3Z" />
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h3v3h-3zM19 14h2v7h-4v-2h-3v2" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name]}
    </svg>
  );
};

const cards = [
  ["Brown Sugar Milk Tea", "Bar station", "4 min", "caramel"],
  ["Boba Bloom Opening", "Opening", "18 min", "counter"],
  ["Tapioca Pearl Batch", "Prep kitchen", "52 min", "pearls"],
  ["Boba Bloom Closing", "Closing", "22 min", "machine"],
];

const coverArtFor = (title: string, savedArt = "caramel") => {
  const normalized = title.toLocaleLowerCase();
  if (normalized.includes("jasmine")) return "jasmine";
  if (normalized.includes("tapioca") || normalized.includes("pearl")) return "pearls";
  if (normalized.includes("clean") || normalized.includes("sanit")) return "cleaning";
  if (normalized.includes("open") || normalized.includes("setup")) return "counter";
  if (normalized.includes("close") || normalized.includes("closing") || normalized.includes("shutdown") || normalized.includes("sealing machine")) return "machine";
  return savedArt || "caramel";
};

const copy = {
  English: [
    "Portion the brown-sugar pearls",
    "Build the milk tea",
    "Add ice and shake",
    "Pour over the pearls",
    "Seal, label, and serve",
  ],
  Español: [
    "Porciona las perlas con azúcar morena",
    "Prepara el té con leche",
    "Añade hielo y agita",
    "Vierte sobre las perlas",
    "Sella, etiqueta y sirve",
  ],
  中文: [
    "分装黑糖珍珠",
    "调制奶茶",
    "加冰并摇匀",
    "倒入珍珠杯",
    "封口、标记并出杯",
  ],
};

type TeamMember = {
  name: string;
  email?: string;
  role: string;
  initials: string;
  progress: number;
  completed: string;
  status: "Certified" | "In progress" | "Invited";
  sample?: boolean;
  accomplishments?: string[];
};

const initialTeam: TeamMember[] = [
  { name: "Maya Tran", email: "maya@bobabloom.com", role: "Owner", initials: "MT", sample: true, progress: 100, completed: "4 of 4", status: "Certified", accomplishments: ["Boba Bloom opening", "Brown Sugar Milk Tea", "Tapioca pearl batch", "Boba Bloom closing"] },
  { name: "Alex Kim", email: "alex@bobabloom.com", role: "Shift lead", initials: "AK", sample: true, progress: 75, completed: "3 of 4", status: "In progress", accomplishments: ["Boba Bloom opening", "Tapioca pearl batch", "Boba Bloom closing"] },
  { name: "Sofia Reyes", email: "sofia@bobabloom.com", role: "Barista", initials: "SR", sample: true, progress: 50, completed: "2 of 4", status: "In progress", accomplishments: ["Brown Sugar Milk Tea", "Boba Bloom opening"] },
  { name: "Jamie Lee", email: "jamie@bobabloom.com", role: "New hire", initials: "JL", sample: true, progress: 25, completed: "1 of 4", status: "In progress", accomplishments: ["Boba Bloom opening"] },
];
const withStarterAccomplishments = (members: TeamMember[]) => members.map((member) => ({
  ...member,
  status: member.status === "Invited" ? "In progress" as const : member.status,
  accomplishments: member.accomplishments || initialTeam.find((starter) => starter.name === member.name)?.accomplishments || [],
  sample: member.sample ?? initialTeam.some((starter) => starter.name === member.name),
  email: member.email || initialTeam.find((starter) => starter.name === member.name)?.email,
}));

type ProcessingState = {
  phase: "uploading" | "analyzing" | "ready" | "error";
  progress: number;
  title: string;
  detail: string;
};

type GeneratedDraft = {
  kind?: "recipe" | "opening" | "closing" | "cleaning" | "batch" | "task";
  assignee?: string;
  frequency?: string;
  title: string;
  station: string;
  ingredients: string[];
  steps: string[];
  timers: string[];
  safetyChecks: string[];
  qualityCues: string[];
  evidence?: string[];
  confidence?: string[];
  warnings: string[];
  sourceFile: string;
  createdAt: string;
};

const inferPlaybookKind = (title: string, station = ""): NonNullable<GeneratedDraft["kind"]> => {
  const value = `${title} ${station}`.toLocaleLowerCase();
  if (/open|opening|setup/.test(value)) return "opening";
  if (/close|closing|shutdown/.test(value)) return "closing";
  if (/clean|sanitize|wash/.test(value)) return "cleaning";
  if (/batch|prep|cook/.test(value)) return "batch";
  if (/recipe|tea|pizza|taco|sandwich|drink|bowl|salad/.test(value)) return "recipe";
  return "task";
};

type RestaurantTemplate = Omit<GeneratedDraft, "sourceFile" | "createdAt"> & {
  id: string;
  cuisine: string;
  duration: string;
};

const restaurantTemplates: RestaurantTemplate[] = [
  {
    id: "italian-pizza-line",
    cuisine: "Italian",
    duration: "12 min",
    title: "Margherita Pizza Line Build",
    station: "Pizza station",
    ingredients: ["Pizza dough ball — set this location's portion", "Tomato sauce — set this location's portion", "Fresh mozzarella — set this location's portion", "Fresh basil", "Olive oil"],
    steps: ["Wash hands and sanitize the work surface", "Stretch dough to the approved size", "Apply sauce and mozzarella evenly", "Bake using the restaurant's validated oven setting", "Finish with basil and olive oil; verify the crust before serving"],
    timers: ["Use the validated bake timer for your oven"],
    safetyChecks: ["Keep cheese refrigerated at 41°F / 5°C or below", "Use a clean, food-contact-safe peel and cutter", "Manager must verify the final bake standard"],
    qualityCues: ["Crust is evenly browned", "Cheese is melted and evenly distributed"],
    warnings: ["Confirm dough, sauce, cheese portions, oven temperature, and bake time for this location."],
  },
  {
    id: "mexican-taco-line",
    cuisine: "Mexican",
    duration: "6 min",
    title: "Chicken Taco Line Build",
    station: "Hot line",
    ingredients: ["Cooked chicken — set this location's portion", "Corn tortillas", "Salsa — set this location's portion", "Diced onion", "Cilantro", "Lime wedge"],
    steps: ["Wash hands and prepare a sanitized station", "Verify chicken holding temperature", "Warm tortillas", "Portion chicken and toppings to house standard", "Plate with lime and complete the final quality check"],
    timers: ["Follow the location's tortilla warming time"],
    safetyChecks: ["Hold cooked chicken at 135°F / 57°C or above", "Prevent raw-to-ready-to-eat cross-contamination", "Use separate clean utensils for each garnish"],
    qualityCues: ["Tortillas are warm and flexible", "Each taco has an even, repeatable portion"],
    warnings: ["Confirm portions, approved holding limits, allergens, and local food-code requirements."],
  },
  {
    id: "indian-tikka-prep",
    cuisine: "Indian",
    duration: "20 min prep",
    title: "Chicken Tikka Marinade Prep",
    station: "Prep kitchen",
    ingredients: ["Chicken — set this location's batch size", "Yogurt marinade — use this location's approved recipe", "Spice blend — use this location's approved recipe", "Lemon juice — set this location's amount"],
    steps: ["Wash hands; sanitize the prep area", "Verify chicken is properly thawed and cold", "Combine the approved marinade ingredients", "Coat chicken evenly without contaminating ready-to-eat surfaces", "Label, date, cover, and refrigerate the batch"],
    timers: ["Use the restaurant's validated marination window"],
    safetyChecks: ["Keep raw chicken at 41°F / 5°C or below", "Use dedicated raw-poultry tools and gloves", "Sanitize all contacted surfaces immediately after prep"],
    qualityCues: ["All pieces are evenly coated", "Container is sealed and correctly labeled"],
    warnings: ["Confirm batch weights, spice quantities, marination limit, cook standard, and allergen labeling."],
  },
  {
    id: "japanese-sushi-rice",
    cuisine: "Japanese",
    duration: "45 min",
    title: "Sushi Rice Batch",
    station: "Rice station",
    ingredients: ["Sushi rice — set this location's batch size", "Water — set the ratio for your equipment", "Seasoning mixture — use this location's approved recipe"],
    steps: ["Wash hands and sanitize equipment", "Rinse and drain rice to the house standard", "Cook with the validated rice-to-water ratio", "Fold in seasoning without crushing the grains", "Label the batch and begin the approved time-control procedure"],
    timers: ["Use the validated cook, rest, and discard timers"],
    safetyChecks: ["Follow the location's approved time or temperature control plan", "Use clean, sanitized rice tools", "Record batch start and discard times"],
    qualityCues: ["Grains are glossy and distinct", "Seasoning is evenly distributed"],
    warnings: ["Manager must enter the approved ratio, pH/time-control procedure, and discard limit before use."],
  },
  {
    id: "mediterranean-hummus",
    cuisine: "Mediterranean",
    duration: "15 min",
    title: "House Hummus Batch",
    station: "Cold prep",
    ingredients: ["Cooked chickpeas — set this location's batch size", "Tahini — set this location's amount", "Lemon juice — set this location's amount", "Garlic — set this location's amount", "Olive oil — set this location's amount"],
    steps: ["Wash hands and sanitize the prep station", "Verify ingredients are within date and specification", "Blend ingredients in the approved order", "Adjust only according to the house recipe", "Transfer, label, date, and refrigerate"],
    timers: ["Follow the location's validated blending time"],
    safetyChecks: ["Keep finished hummus at 41°F / 5°C or below", "Declare sesame and other applicable allergens", "Use a clean, sanitized blender and storage container"],
    qualityCues: ["Texture is smooth and consistent", "No unapproved garnish or recipe variation"],
    warnings: ["Confirm ingredient weights, shelf life, allergen statement, and batch yield."],
  },
  {
    id: "chinese-wok-close",
    cuisine: "Chinese",
    duration: "18 min",
    title: "Wok Station Closing",
    station: "Wok station",
    ingredients: ["Approved degreaser", "Food-contact sanitizer", "Clean towels", "Waste container"],
    steps: ["Turn off equipment according to manufacturer instructions", "Remove, label, and store approved food items", "Dispose of waste and scrape cooled debris", "Wash, rinse, and sanitize removable food-contact parts", "Clean surrounding surfaces and complete the manager check"],
    timers: ["Maintain sanitizer contact time shown on its label"],
    safetyChecks: ["Allow hot equipment to cool before cleaning", "Never mix cleaning chemicals", "Verify sanitizer concentration with the approved test method"],
    qualityCues: ["No visible grease or food debris remains", "Tools are dry and stored in their assigned locations"],
    warnings: ["Confirm equipment shutdown steps and chemical label instructions for this location."],
  },
  {
    id: "thai-pad-thai-line",
    cuisine: "Thai", duration: "9 min", title: "Pad Thai Line Build", station: "Wok station",
    ingredients: ["Rice noodles — set this location's portion", "Pad Thai sauce — set this location's portion", "Protein — per ticket", "Bean sprouts", "Peanuts and lime garnish"],
    steps: ["Sanitize the station and verify mise en place", "Cook the specified protein using the approved procedure", "Add noodles and measured sauce", "Toss until evenly coated and properly heated", "Plate and apply only ticket-approved garnishes"],
    timers: ["Use the location's validated wok cook time"], safetyChecks: ["Prevent raw-protein cross-contamination", "Verify the required final cooking temperature", "Declare peanut, egg, shellfish, and soy allergens as applicable"],
    qualityCues: ["Noodles are tender, separate, and evenly coated"], warnings: ["Confirm portions, cook temperatures, sauce recipe, and allergen matrix."],
  },
  {
    id: "korean-bulgogi-prep",
    cuisine: "Korean", duration: "25 min prep", title: "Bulgogi Batch Prep", station: "Prep kitchen",
    ingredients: ["Sliced beef — set this location's batch size", "Bulgogi marinade — use this location's approved recipe", "Onion", "Scallion"],
    steps: ["Sanitize the prep area", "Verify beef temperature and date", "Measure the approved marinade", "Coat beef evenly", "Cover, label, date, and refrigerate"],
    timers: ["Use the approved marination window"], safetyChecks: ["Keep raw beef at 41°F / 5°C or below", "Use dedicated raw-protein tools", "Declare soy and sesame allergens"],
    qualityCues: ["Slices are evenly coated without excess pooled marinade"], warnings: ["Confirm batch weights, marination limit, cook standard, and allergens."],
  },
  {
    id: "vietnamese-pho-broth",
    cuisine: "Vietnamese", duration: "4 hr batch", title: "Pho Broth Batch", station: "Stock station",
    ingredients: ["Prepared stock ingredients — use this location's approved batch sheet", "Toasted aromatics", "Spice sachet", "Seasoning — use this location's measured recipe"],
    steps: ["Verify the batch sheet and sanitized equipment", "Combine ingredients in the approved order", "Bring to the validated cooking temperature", "Maintain the approved simmer and skim as specified", "Strain, label, and hold or cool using the approved method"],
    timers: ["Use validated cook and cooling timers"], safetyChecks: ["Record cooking, holding, and cooling temperatures", "Use safe lifting practices", "Cool using the location's approved two-stage process when applicable"],
    qualityCues: ["Broth is clear, aromatic, and matches the approved taste standard"], warnings: ["Confirm exact batch recipe, cook time, cooling method, and logs."],
  },
  {
    id: "american-burger-line",
    cuisine: "American", duration: "7 min", title: "Classic Burger Line Build", station: "Grill station",
    ingredients: ["Burger patty — set this location's specification", "Bun", "Cheese — per ticket", "Produce and sauce — set this location's portions"],
    steps: ["Sanitize the station and verify ticket", "Cook patty using dedicated raw and cooked utensils", "Verify final temperature", "Toast bun and assemble to ticket", "Complete allergen and presentation check"],
    timers: ["Use the validated grill timer as a prompt, not a temperature substitute"], safetyChecks: ["Verify the required internal temperature with a calibrated thermometer", "Prevent raw-to-ready-to-eat contact", "Follow allergy-ticket controls"],
    qualityCues: ["Build is centered, clean, and matches the ticket"], warnings: ["Confirm patty weight, validated cook standard, portions, and allergen procedure."],
  },
];

type LocationStarter = {
  id: string;
  name: string;
  cuisine: string;
  primaryTemplateId: string;
  playbooks: string[][];
};

const locationStarters: LocationStarter[] = restaurantTemplates.map((template) => {
  const additional: Record<string, string[][]> = {
    Italian: [["Pasta Station Opening", "Hot line", "15 min", "counter"], ["Fresh Sauce Cooling", "Prep kitchen", "35 min", "caramel"], ["Dining Room Close", "Front of house", "20 min", "machine"]],
    Mexican: [["Salsa Batch Prep", "Cold prep", "20 min", "caramel"], ["Tortilla Station Opening", "Hot line", "12 min", "counter"], ["Grill Closing", "Grill station", "25 min", "machine"]],
    Indian: [["Basmati Rice Batch", "Rice station", "35 min", "pearls"], ["Tandoor Opening", "Hot line", "18 min", "counter"], ["Spice Station Close", "Prep kitchen", "15 min", "machine"]],
    Japanese: [["Miso Soup Batch", "Hot line", "25 min", "pearls"], ["Cold Line Opening", "Cold prep", "15 min", "counter"], ["Rice Station Close", "Rice station", "18 min", "machine"]],
    Mediterranean: [["Chicken Shawarma Setup", "Hot line", "20 min", "counter"], ["Tzatziki Batch", "Cold prep", "15 min", "caramel"], ["Prep Kitchen Close", "Prep kitchen", "22 min", "machine"]],
    Chinese: [["Fried Rice Line Build", "Wok station", "8 min", "pearls"], ["Sauce Station Opening", "Prep kitchen", "15 min", "counter"], ["Walk-in Closing Check", "Closing", "12 min", "machine"]],
    Thai: [["Green Curry Batch", "Hot line", "35 min", "pearls"], ["Cold Garnish Opening", "Cold prep", "12 min", "counter"], ["Wok Station Close", "Wok station", "20 min", "machine"]],
    Korean: [["Banchan Cold-Hold Check", "Cold prep", "10 min", "caramel"], ["Grill Station Opening", "Grill station", "18 min", "counter"], ["Vent Hood Close", "Closing", "22 min", "machine"]],
    Vietnamese: [["Fresh Roll Station Setup", "Cold prep", "15 min", "caramel"], ["Noodle Station Opening", "Hot line", "20 min", "counter"], ["Stock Station Close", "Closing", "25 min", "machine"]],
    American: [["Fryer Opening Check", "Fry station", "15 min", "counter"], ["Produce Line Setup", "Cold prep", "18 min", "caramel"], ["Grill Station Close", "Grill station", "25 min", "machine"]],
  };
  return {
    id: `location-${template.cuisine.toLocaleLowerCase()}`,
    name: `${template.cuisine} Restaurant Starter`,
    cuisine: template.cuisine,
    primaryTemplateId: template.id,
    playbooks: [[template.title, template.station, template.duration, "caramel"], ...(additional[template.cuisine] || []), ["Daily Cleaning Checklist", "Cleaning", "30 min", "cleaning"]],
  };
});

const sampleSecondLocation: LocationStarter = {
  id: "boba-bloom-downtown",
  name: "Boba Bloom Downtown",
  cuisine: "Boba café",
  primaryTemplateId: "",
  playbooks: [
    ["Downtown Opening Checklist", "Opening", "18 min", "counter"],
    ["Jasmine Milk Tea Batch", "Prep kitchen", "35 min", "jasmine"],
    ["Tapioca Pearl Batch", "Prep kitchen", "52 min", "pearls"],
    ["Sealing Machine Close", "Closing", "12 min", "machine"],
    ["Downtown Daily Cleaning", "Cleaning", "30 min", "cleaning"],
  ],
};

// One source of truth for shift routines. The Tasks checklist and the
// opening/closing playbook read the same arrays, so a location can never show
// two different answers for the same job.
const BOBA_OPENING_STEPS = [
  "Power on tea brewers and set water to 200°F",
  "Check refrigerator temperature is at or below 41°F / 5°C",
  "Brew black and jasmine tea batches",
  "Cook first tapioca pearl batch",
  "Restock cups, lids, straws, and napkins",
  "Sanitize bar, shaker tins, and sealing machine",
  "Count register drawer and open POS",
  "Complete front-of-house safety walk",
];
const BOBA_CLOSING_STEPS = [
  "Label, date, and store every approved ingredient",
  "Discard expired tea, milk, fruit, and cooked pearls",
  "Record refrigerator and freezer temperatures",
  "Wash, rinse, and sanitize tea brewers and shaker tins",
  "Clean and power down the cup sealing machine",
  "Restock cups, lids, straws, napkins, and sanitizer",
  "Close the POS, secure the cash drawer, and log the count",
  "Complete the final safety walk and lock all entrances",
];
const GENERIC_OPENING_STEPS = [
  "Clock in and complete the safety walk",
  "Wash hands and verify the station is clean",
  "Check and record refrigeration temperatures",
  "Power on and inspect assigned equipment",
  "Stock dated ingredients and service supplies",
  "Sign the opening check and report exceptions to the shift lead",
];
const GENERIC_CLOSING_STEPS = [
  "Stop production and label or discard food according to policy",
  "Record final holding and refrigeration temperatures",
  "Turn off equipment using manufacturer instructions",
  "Wash, rinse, and sanitize food-contact surfaces",
  "Remove waste and restock essential supplies",
  "Complete the closing walk and sign the log",
];
const isBobaCuisine = (cuisine: string) => /boba|bubble tea|tea house|caf/i.test(cuisine);
const openingStepsFor = (cuisine: string) => (isBobaCuisine(cuisine) ? BOBA_OPENING_STEPS : GENERIC_OPENING_STEPS);
const closingStepsFor = (cuisine: string) => (isBobaCuisine(cuisine) ? BOBA_CLOSING_STEPS : GENERIC_CLOSING_STEPS);

const starterGoals = [
  { id: "goal-boba-openers", title: "Certify every opener on the opening checklist", done: false, location: "boba-bloom" },
  { id: "goal-boba-waste", title: "Record every closing waste check for seven days", done: false, location: "boba-bloom" },
  { id: "goal-downtown-pearls", title: "Train the Downtown team on the pearl batch standard", done: false, location: "boba-bloom-downtown" },
  { id: "goal-downtown-close", title: "Complete five consecutive Downtown closing logs", done: false, location: "boba-bloom-downtown" },
];

const starterActivityByLocation: Record<string, { worker: string; initials: string; task: string; detail: string }[]> = {
  "boba-bloom": [
    { worker: "Maya Tran", initials: "MT", task: "Boba Bloom opening", detail: "Starter training history" },
    { worker: "Alex Kim", initials: "AK", task: "Tapioca pearl batch", detail: "Starter training history" },
    { worker: "Sofia Reyes", initials: "SR", task: "Brown Sugar Milk Tea", detail: "Starter training history" },
  ],
  "boba-bloom-downtown": [
    { worker: "Alex Kim", initials: "AK", task: "Downtown Opening Checklist", detail: "Downtown launch training" },
    { worker: "Maya Tran", initials: "MT", task: "Jasmine Milk Tea Batch", detail: "Downtown launch training" },
    { worker: "Sofia Reyes", initials: "SR", task: "Sealing Machine Close", detail: "Downtown launch training" },
  ],
};

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 5 * 60;
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

// The model often returns structured entries — {item, amount} for an
// ingredient, {action, duration} for a timer. Read them back as the line a
// worker would read, never as raw JSON.
const asText = (item: unknown): string => {
  if (typeof item === "string") return item.trim();
  if (item === null || item === undefined) return "";
  if (typeof item !== "object") return String(item);
  const record = item as Record<string, unknown>;
  const label = [record.item, record.ingredient, record.name, record.step, record.action, record.check, record.cue]
    .find((field): field is string => typeof field === "string" && field.trim().length > 0);
  const detail = [record.amount, record.quantity, record.duration, record.time, record.value]
    .find((field): field is string => typeof field === "string" && field.trim().length > 0);
  if (label && detail) return `${label.trim()} — ${detail.trim()}`;
  if (label) return label.trim();
  const parts = Object.values(record).filter((field): field is string => typeof field === "string" && field.trim().length > 0);
  return parts.join(" — ");
};

const asTypedLines = (value: string): string[] =>
  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    return asList(JSON.parse(value));
  } catch {
    return value.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
  }
};

const findRecordWithRecipeFields = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      return findRecordWithRecipeFields(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecordWithRecipeFields(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => ["playbook_title", "steps_json", "ingredients_json", "safety_checks_json"].includes(key))) return record;
  for (const item of Object.values(record)) {
    const found = findRecordWithRecipeFields(item);
    if (found) return found;
  }
  return null;
};

// A RocketRide run can resolve with an error payload instead of rejecting —
// an unresolved provider key comes back this way. Treat that as a failure
// rather than letting an empty draft reach the owner as a review screen.
const pipelineErrorMessage = (result: unknown): string => {
  const seen = new Set<object>();
  const walk = (value: unknown): string => {
    if (!value || typeof value !== "object" || seen.has(value as object)) return "";
    seen.add(value as object);
    const record = value as Record<string, unknown>;
    const error = record.error;
    if (typeof error === "string" && error.trim()) return error.trim();
    if (error && typeof error === "object") {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }
    for (const item of Object.values(record)) {
      const found = walk(item);
      if (found) return found;
    }
    return "";
  };
  return walk(result);
};

const normalizeDraft = (result: unknown, sourceFile: string): GeneratedDraft => {
  const record = findRecordWithRecipeFields(result) ?? {};
  const ingredients = asList(record.ingredients_json ?? record.ingredients);
  const steps = asList(record.steps_json ?? record.steps);
  const timers = asList(record.timers_json ?? record.timers);
  const safetyChecks = asList(record.safety_checks_json ?? record.safety_checks);
  const qualityCues = asList(record.quality_cues_json ?? record.quality_cues);
  const evidence = asList(record.evidence_json ?? record.evidence);
  const confidence = asList(record.confidence_json ?? record.confidence);
  const warnings = [
    !record.playbook_title && "Confirm the playbook title.",
    ingredients.length === 0 && "No reliable ingredient measurements were detected.",
    steps.length === 0 && "No ordered steps were returned; review the footage and retry.",
    safetyChecks.length === 0 && "Add at least one food-safety check before publishing.",
    evidence.length === 0 && steps.length > 0 && "No timestamp or transcript evidence was returned. Confirm each step against the source.",
    confidence.some((item) => /low|guess|infer|missing/i.test(item)) && "At least one step was inferred with low confidence. Verify those measurements before publishing.",
  ].filter((warning): warning is string => Boolean(warning))
    .concat(lowConfidenceWarning(record.confidence_json ?? record.confidence));
  const title = typeof record.playbook_title === "string" && record.playbook_title.trim() ? record.playbook_title.trim() : sourceFile.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const station = typeof record.station === "string" && record.station.trim() ? record.station.trim() : "Unassigned station";
  return {
    kind: inferPlaybookKind(title, station),
    assignee: "Assigned team member",
    frequency: "As scheduled",
    title,
    station,
    ingredients,
    steps,
    timers,
    safetyChecks,
    qualityCues,
    evidence,
    confidence,
    warnings,
    sourceFile,
    createdAt: new Date().toISOString(),
  };
};

// Some containers and codecs fire neither loadedmetadata nor error in a given
// browser — a phone recording is a common case. Waiting forever left the app
// looking dead, so an unreadable duration resolves to NaN and the caller skips
// the length check rather than blocking a legitimate upload. The size cap
// still bounds what reaches the pipeline.
const readVideoDuration = (file: File) =>
  new Promise<number>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timer = window.setTimeout(() => finish(Number.NaN), 8000);
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(Number.NaN);
    video.src = url;
  });

// One playbook per location and title. Older builds could write a second
// record for the same procedure, which showed up as duplicate cards and a
// published playbook reading "Needs review". Keep the published copy, then
// the highest version.
const dedupeRecords = (records: PlaybookRecord[]): PlaybookRecord[] => {
  const best = new Map<string, PlaybookRecord>();
  for (const record of records) {
    const key = `${record.locationId}::${record.draft.title.trim().toLocaleLowerCase()}`;
    const current = best.get(key);
    if (!current) { best.set(key, record); continue; }
    const beats = record.status === "published" && current.status !== "published"
      ? true
      : record.status === current.status && record.version > current.version;
    if (beats) best.set(key, record);
  }
  return records.filter((record) => best.get(`${record.locationId}::${record.draft.title.trim().toLocaleLowerCase()}`) === record);
};

const slugify = (value: string) =>
  value.toLocaleLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type CompletionRecord = {
  playbook: string;
  playbookId?: string;
  locationId?: string;
  kind?: "playbook" | "checklist";
  completedAt: string;
  worker: string;
};

type RunMetric = {
  source: "video" | "image";
  status: "success" | "error";
  durationMs: number;
  completedAt: string;
};

type PlaybookRecord = {
  id: string;
  locationId: string;
  status: "draft" | "published";
  version: number;
  draft: GeneratedDraft;
  updatedAt: string;
  shareUrl?: string;
};

type SharedPlaybookState = {
  draft: GeneratedDraft | null;
  status: "draft" | "published";
  completions: CompletionRecord[];
  locations?: LocationStarter[];
  goals?: { id: string; title: string; done: boolean; location?: string }[];
  team?: TeamMember[];
  shiftChecks?: number[];
  closingChecks?: number[];
  checklistProgress?: Record<string, { opening: number[]; closing: number[] }>;
  playbooks?: PlaybookRecord[];
  runMetrics?: RunMetric[];
  updatedAt: string;
};

const SHARED_STATE_PATH = "playbook/shared-state.json";
const APP_ID = "prabhjeev_sohi.playbook";

// Portion scaling. Three rules learned from real generated content:
// a range ("2-3 g") must scale both ends or the worker gets a wrong low
// bound; a measurement naming a vessel ("a 500 ml serving cup") is equipment,
// not an amount; and owners write "cups" and "grams" as often as "g".
const SCALE_UNITS = "kg|g|grams?|mg|ml|millilit(?:re|er)s?|l|lit(?:re|er)s?|oz|ounces?|lbs?|pounds?|cups?|tbsp|tablespoons?|tsp|teaspoons?|pieces?|pcs";
// Spoken recipes are full of fractions. Without this, "1/2 cup" matched only
// the 2 and doubling produced "1/4 cup" — half the amount, stated confidently.
const SCALE_VALUE = "\\d[\\d,]*(?:\\.\\d+)?(?:\\s+\\d+/\\d+)?|\\d+/\\d+";
const SCALE_PATTERN = new RegExp(
  `(?:((?:${SCALE_VALUE}))\\s*(?:-|–|—|to)\\s*)?((?:${SCALE_VALUE}))\\s*(${SCALE_UNITS})\\b`,
  "gi",
);

const parseAmount = (raw: string) => {
  const value = String(raw).replace(/,/g, "").trim();
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const plain = Number(value);
  return Number.isFinite(plain) ? plain : Number.NaN;
};
const VESSEL_FOLLOWS = /^[\s-]*(?:[a-z]+\s+){0,2}(?:cup|cups|jug|pitcher|pan|pot|container|bottle|tin|shaker|measure|scoop|bowl|tray|mold|mould|cooker|strainer)\b/i;

// Timers, evidence and confidence come back as independent lists, not one
// entry per step, so rendering them by array position put the wrong timer and
// the wrong source line under each step. Align them by content instead.
// A scanned QR opens on a device with no session, no token and no way to read
// the signed snapshot (it lives on the storage host, a different origin, with
// no CORS headers). So the playbook travels inside the link itself: deflated,
// base64url encoded, and readable offline.
type WorkerPayload = { k?: string; t: string; s: string; a?: string; f?: string; i: string[]; p: string[]; m: string[]; c: string[]; q: string[] };

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const encodeWorkerPayload = async (draft: GeneratedDraft): Promise<string> => {
  const payload: WorkerPayload = {
    k: draft.kind, t: draft.title, s: draft.station, a: draft.assignee, f: draft.frequency,
    i: draft.ingredients, p: draft.steps, m: draft.timers, c: draft.safetyChecks, q: draft.qualityCues,
  };
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream !== "function") return toBase64Url(raw);
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
};

const decodeWorkerPayload = async (value: string): Promise<GeneratedDraft | null> => {
  try {
    const bytes = fromBase64Url(value);
    let json: string;
    if (typeof DecompressionStream === "function") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      json = new TextDecoder().decode(await new Response(stream).arrayBuffer());
    } else {
      json = new TextDecoder().decode(bytes);
    }
    const payload = JSON.parse(json) as WorkerPayload;
    if (!payload?.t || !Array.isArray(payload.p)) return null;
    return {
      kind: payload.k as GeneratedDraft["kind"],
      title: payload.t,
      station: payload.s || "Unassigned station",
      assignee: payload.a,
      frequency: payload.f,
      ingredients: payload.i || [],
      steps: payload.p || [],
      timers: payload.m || [],
      safetyChecks: payload.c || [],
      qualityCues: payload.q || [],
      warnings: [],
      sourceFile: "Workstation QR",
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const keywords = (text: string) => new Set(text.toLocaleLowerCase().match(/[a-z]{4,}/g) || []);

const alignTimersToSteps = (timers: string[], steps: string[]) => {
  const perStep: string[] = new Array(steps.length).fill("");
  if (!timers.length || !steps.length) return { perStep, unmatched: timers };
  const stepWords = steps.map(keywords);
  const unmatched: string[] = [];
  for (const timer of timers) {
    const timerWords = keywords(timer);
    let best = -1;
    let bestScore = 0;
    stepWords.forEach((words, index) => {
      if (perStep[index]) return;
      let score = 0;
      timerWords.forEach((word) => { if (words.has(word)) score += 1; });
      if (score > bestScore) { bestScore = score; best = index; }
    });
    if (best >= 0 && bestScore > 1) perStep[best] = timer;
    else unmatched.push(timer);
  }
  return { perStep, unmatched };
};

// Source lines are only trustworthy per step when the original was numbered.
// Showing the title as "evidence" for step one is worse than showing nothing.
const alignEvidenceToSteps = (evidence: string[], steps: string[]): string[] => {
  if (!evidence.length || !steps.length) return [];
  const numbered = new Map<number, string>();
  for (const line of evidence) {
    const match = line.match(/^\s*(\d{1,2})\s*[.)]/);
    if (!match) continue;
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < steps.length && !numbered.has(index)) numbered.set(index, line.trim());
  }
  if (!numbered.size) return [];
  return steps.map((_, index) => numbered.get(index) ?? "");
};

// The pipeline reports confidence per extracted field, not per step. Turn the
// weak fields into review warnings so the gate reflects real uncertainty.
const CONFIDENCE_LABELS: Record<string, string> = {
  playbook_title: "the title",
  station: "the station",
  ingredients_json: "ingredient amounts",
  steps_json: "the ordered steps",
  timers_json: "the timers",
  safety_checks_json: "the safety checks",
  quality_cues_json: "the quality cues",
};

const lowConfidenceWarning = (value: unknown): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const weak = Object.entries(value as Record<string, unknown>)
    .filter(([field, score]) => typeof score === "number" && score < 0.9 && CONFIDENCE_LABELS[field])
    .map(([field]) => CONFIDENCE_LABELS[field]);
  if (!weak.length) return [];
  return [`RocketRide was less certain about ${weak.join(", ")}. Check these against the source before publishing.`];
};

const scaleMeasurements = (text: string, servings: number) => {
  // At one batch the owner's own wording is the right wording — rewriting
  // "1/2 cup" as "0.5 cup" helps nobody.
  if (servings === 1) return text;
  return text.replace(SCALE_PATTERN, (match, low: string | undefined, high: string, unit: string, offset: number) => {
    if (VESSEL_FOLLOWS.test(text.slice(offset + match.length))) return match;
    const amount = parseAmount(high);
    if (!Number.isFinite(amount)) return match;
    const format = (value: number) => (Math.round(value * servings * 100) / 100).toLocaleString("en-US");
    if (low === undefined) return `${format(amount)} ${unit}`;
    const lowAmount = parseAmount(low);
    if (!Number.isFinite(lowAmount)) return match;
    return `${format(lowAmount)}-${format(amount)} ${unit}`;
  });
};

const withStagingStore = async <T,>(userToken: string, action: (client: RocketRideClient) => Promise<T>) => {
  const client = new RocketRideClient({
    auth: userToken,
    uri: "https://staging.rocketride.ai",
    requestTimeout: 30_000,
  });
  try {
    await client.connect();
    return await action(client);
  } finally {
    await client.disconnect().catch(() => undefined);
  }
};

const App: React.FC<ShellAppProps> = ({ isConnected, identity }) => {
  const initialWorkerLink = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "worker";
  const initialPlaybookSlug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("playbook") : null;
  const initialShareUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("source") : null;
  const initialWorkerPayload = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("d") : null;
  const [page, setPage] = useState<"home" | "recipe">(initialWorkerLink ? "recipe" : "home"),
    [selectedRecipe, setSelectedRecipe] = useState<"default" | "generated">(initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea" ? "generated" : "default"),
    [section, setSection] = useState("Home"),
    [modal, setModal] = useState(false),
    [createKind, setCreateKind] = useState<GeneratedDraft["kind"]>("recipe"),
    [locationModalOpen, setLocationModalOpen] = useState(false),
    [processing, setProcessing] = useState(false),
    [fileName, setFileName] = useState(""),
    [templateQuery, setTemplateQuery] = useState(""),
    [newLocationName, setNewLocationName] = useState(""),
    [selectedLocationTemplateId, setSelectedLocationTemplateId] = useState(locationStarters[0]?.id || ""),
    [processingState, setProcessingState] = useState<ProcessingState | null>(null),
    [reviewOpen, setReviewOpen] = useState(false),
    [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(() => {
      try {
        if (initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea") {
          const records = JSON.parse(localStorage.getItem("playbook-records") || "[]") as PlaybookRecord[];
          const requested = records.find((record) => record.id === initialPlaybookSlug);
          if (requested) return requested.draft;
        }
        return JSON.parse(localStorage.getItem("playbook-latest-draft") || "null");
      } catch {
        return null;
      }
    }),
    [reviewError, setReviewError] = useState(""),
    [warningsAcknowledged, setWarningsAcknowledged] = useState(false),
    [activeRecordId, setActiveRecordId] = useState<string | null>(initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea" ? initialPlaybookSlug : null),
    [playbookRecords, setPlaybookRecords] = useState<PlaybookRecord[]>(() => {
      try { return JSON.parse(localStorage.getItem("playbook-records") || "[]"); } catch { return []; }
    }),
    [draftStatus, setDraftStatus] = useState<"draft" | "published">(
      () => {
        try {
          if (initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea") {
            const requested = (JSON.parse(localStorage.getItem("playbook-records") || "[]") as PlaybookRecord[]).find((record) => record.id === initialPlaybookSlug);
            if (requested) return requested.status;
          }
        } catch { /* use legacy status */ }
        return localStorage.getItem("playbook-latest-draft-status") === "published" ? "published" : "draft";
      },
    ),
    [servings, setServings] = useState(1),
    [lang, setLang] = useState<keyof typeof copy>("English"),
    [timer, setTimer] = useState(10),
    [running, setRunning] = useState(false),
    [done, setDone] = useState<number[]>([]),
    [defaultStepDone, setDefaultStepDone] = useState<number[]>([]),
    [defaultCompletionSaved, setDefaultCompletionSaved] = useState(false),
    [generatedDone, setGeneratedDone] = useState<number[]>([]),
    [completionSaved, setCompletionSaved] = useState(false),
    [workerLoadError, setWorkerLoadError] = useState(""),
    [workerShareLoaded, setWorkerShareLoaded] = useState(false),
    [cloudStatus, setCloudStatus] = useState<"local" | "syncing" | "synced" | "error">("local"),
    [cloudLoaded, setCloudLoaded] = useState(false),
    [activeLocation, setActiveLocation] = useState(() => localStorage.getItem("playbook-active-location") || "boba-bloom"),
    [createdLocations, setCreatedLocations] = useState<LocationStarter[]>(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("playbook-locations") || "[]") as LocationStarter[];
        return stored.length ? stored : [sampleSecondLocation];
      } catch { return [sampleSecondLocation]; }
    }),
    [goalInput, setGoalInput] = useState(""),
    [goals, setGoals] = useState<{ id: string; title: string; done: boolean; location?: string }[]>(() => {
      try { return JSON.parse(localStorage.getItem("playbook-goals") || "[]"); } catch { return []; }
    }),
    [completionRecords, setCompletionRecords] = useState<CompletionRecord[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("playbook-completions") || "[]");
      } catch {
        return [];
      }
    }),
    [runMetrics, setRunMetrics] = useState<RunMetric[]>(() => {
      try { return JSON.parse(localStorage.getItem("playbook-run-metrics") || "[]"); } catch { return []; }
    }),
    [playbookQuery, setPlaybookQuery] = useState(""),
    [stationFilter, setStationFilter] = useState("All stations"),
    [statusFilter, setStatusFilter] = useState("All statuses"),
    [qrOpen, setQrOpen] = useState(false),
    [qrDataUrl, setQrDataUrl] = useState(""),
    [qrLinkUrl, setQrLinkUrl] = useState(""),
    [qrCopied, setQrCopied] = useState(false),
    qrLinkRef = useRef<HTMLInputElement>(null),
    [inviteOpen, setInviteOpen] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [selectedMember, setSelectedMember] = useState<TeamMember | null>(null),
    [inviteName, setInviteName] = useState(""),
    [inviteEmail, setInviteEmail] = useState(""),
    [inviteError, setInviteError] = useState(""),
    [inviteRole, setInviteRole] = useState("Barista"),
    [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("playbook-team") || "[]") as TeamMember[];
        return stored.length ? withStarterAccomplishments(stored) : initialTeam;
      } catch { return initialTeam; }
    }),
    [checklistProgress, setChecklistProgress] = useState<Record<string, { opening: number[]; closing: number[] }>>(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("playbook-checklist-progress") || "null");
        if (stored) return stored;
        return { "boba-bloom": { opening: JSON.parse(localStorage.getItem("mise-shift-checks") || "[]"), closing: JSON.parse(localStorage.getItem("mise-closing-checks") || "[]") } };
      } catch { return {}; }
    }),
    [activeChecklist, setActiveChecklist] = useState<"opening" | "closing">("opening");
  const activeClient = useRef<RocketRideClient | null>(null);
  const activeToken = useRef<string | null>(null);
  const retryInput = useRef<{ file: File; kind: "video" | "image" } | null>(null);
  useEffect(() => {
    if (!running || timer <= 0) return;
    const id = window.setInterval(() => setTimer((v) => v - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, timer]);
  useEffect(() => {
    if (!modal && !locationModalOpen && !reviewOpen && !inviteOpen && !qrOpen && !profileOpen && !selectedMember) return;
    const closeTopDialog = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (qrOpen) setQrOpen(false);
      else if (inviteOpen) setInviteOpen(false);
      else if (locationModalOpen) setLocationModalOpen(false);
      else if (selectedMember) setSelectedMember(null);
      else if (profileOpen) setProfileOpen(false);
      else if (reviewOpen) setReviewOpen(false);
      else setModal(false);
    };
    window.addEventListener("keydown", closeTopDialog);
    return () => window.removeEventListener("keydown", closeTopDialog);
  }, [modal, locationModalOpen, reviewOpen, inviteOpen, qrOpen, profileOpen, selectedMember]);
  const activeChecklistProgress = checklistProgress[activeLocation] || { opening: [], closing: [] };
  const shiftChecks = activeChecklistProgress.opening;
  const closingChecks = activeChecklistProgress.closing;
  useEffect(() => {
    localStorage.setItem("playbook-checklist-progress", JSON.stringify(checklistProgress));
  }, [checklistProgress]);
  useEffect(() => {
    localStorage.setItem("playbook-completions", JSON.stringify(completionRecords));
  }, [completionRecords]);
  useEffect(() => { localStorage.setItem("playbook-goals", JSON.stringify(goals)); }, [goals]);
  useEffect(() => {
    if (localStorage.getItem("playbook-starter-goals-v1")) return;
    setGoals((items) => [...items, ...starterGoals.filter((starter) => !items.some((item) => item.id === starter.id))]);
    localStorage.setItem("playbook-starter-goals-v1", "added");
  }, []);
  useEffect(() => { localStorage.setItem("playbook-team", JSON.stringify(teamMembers)); }, [teamMembers]);
  useEffect(() => { localStorage.setItem("playbook-records", JSON.stringify(playbookRecords)); }, [playbookRecords]);
  useEffect(() => { localStorage.setItem("playbook-run-metrics", JSON.stringify(runMetrics)); }, [runMetrics]);
  useEffect(() => {
    localStorage.setItem("playbook-active-location", activeLocation);
    localStorage.setItem("playbook-locations", JSON.stringify(createdLocations));
  }, [activeLocation, createdLocations]);
  useEffect(() => {
    if (!isConnected || !identity?.userToken) return;
    let cancelled = false;
    setCloudStatus("syncing");
    void withStagingStore(identity.userToken, async (client) => {
      const stat = await client.fsStat(SHARED_STATE_PATH);
      if (!stat.exists) return null;
      return client.fsReadJson<SharedPlaybookState>(SHARED_STATE_PATH);
    })
      .then((shared) => {
        if (cancelled) return;
        if (shared?.draft && !initialWorkerLink) {
          setGeneratedDraft(shared.draft);
          setDraftStatus(shared.status);
          localStorage.setItem("playbook-latest-draft", JSON.stringify(shared.draft));
          localStorage.setItem("playbook-latest-draft-status", shared.status);
        }
        if (shared?.completions) setCompletionRecords(shared.completions);
        if (shared?.locations) setCreatedLocations(shared.locations.length ? shared.locations : [sampleSecondLocation]);
        if (shared?.goals) setGoals(shared.goals.length ? shared.goals : starterGoals);
        if (shared?.team) setTeamMembers(shared.team.length ? withStarterAccomplishments(shared.team) : initialTeam);
        if (shared?.checklistProgress) setChecklistProgress(shared.checklistProgress);
        else if (shared?.shiftChecks || shared?.closingChecks) setChecklistProgress({ "boba-bloom": { opening: shared.shiftChecks || [], closing: shared.closingChecks || [] } });
        if (shared?.playbooks) {
          setPlaybookRecords(dedupeRecords(shared.playbooks));
          const requested = initialPlaybookSlug ? shared.playbooks.find((record) => record.id === initialPlaybookSlug) : undefined;
          if (requested) {
            setActiveRecordId(requested.id);
            setGeneratedDraft(requested.draft);
            setDraftStatus(requested.status);
          }
        }
        if (shared?.runMetrics) setRunMetrics(shared.runMetrics);
        if (shared?.draft && (!shared.playbooks || shared.playbooks.length === 0)) {
          const migrated: PlaybookRecord = {
            id: crypto.randomUUID(),
            locationId: activeLocation,
            status: shared.status,
            version: 1,
            draft: shared.draft,
            updatedAt: shared.updatedAt || new Date().toISOString(),
          };
          setPlaybookRecords([migrated]);
          setActiveRecordId(migrated.id);
        }
        setCloudStatus("synced");
        setCloudLoaded(true);
      })
      .catch(() => { if (!cancelled) { setCloudStatus("error"); setCloudLoaded(true); } });
    return () => { cancelled = true; };
  }, [isConnected, identity?.userToken]);
  useEffect(() => {
    const requestedGenerated = initialWorkerLink && initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea";
    if (!requestedGenerated) return;
    let cancelled = false;
    const applySnapshot = (id: string, draft: GeneratedDraft) => {
      if (cancelled || !draft) return;
      setActiveRecordId(id);
      setGeneratedDraft(draft);
      setDraftStatus("published");
      setSelectedRecipe("generated");
      setWorkerLoadError("");
      setWorkerShareLoaded(true);
    };
    // A self-contained link needs no session, no socket and no storage host,
    // so it is tried first and works offline.
    if (initialWorkerPayload) {
      void decodeWorkerPayload(initialWorkerPayload).then((draft) => {
        if (cancelled) return;
        if (draft) { applySnapshot(initialPlaybookSlug as string, draft); return; }
        setWorkerLoadError("This workstation link is damaged. Ask the owner to reprint the QR code.");
        setWorkerShareLoaded(true);
      });
      return;
    }
    if (!initialShareUrl) {
      const local = playbookRecords.find((record) => record.id === initialPlaybookSlug && record.status === "published");
      if (local) applySnapshot(local.id, local.draft);
      else {
        setWorkerLoadError("This workstation link is missing a published snapshot. Ask the owner to republish and reprint the QR.");
        setWorkerShareLoaded(true);
      }
      return;
    }
    // The signed snapshot lives on the storage host, a different origin from
    // the shell, so a browser fetch of it is refused by CORS — it only ever
    // worked from Node. Read it through the SDK first and keep the direct
    // fetch as the fallback for contexts where the URL is readable.
    type Snapshot = { id: string; draft: GeneratedDraft; version: number };
    const snapshotPath = `playbook/public/${initialPlaybookSlug}.json`;
    const viaSdk = async (): Promise<Snapshot | null> => {
      if (!identity?.userToken) return null;
      return withStagingStore(identity.userToken, async (client) => {
        const stat = await client.fsStat(snapshotPath);
        if (!stat.exists) return null;
        return client.fsReadJson<Snapshot>(snapshotPath);
      });
    };
    const viaUrl = async (): Promise<Snapshot> => {
      const response = await fetch(initialShareUrl);
      if (!response.ok) throw new Error(`Shared playbook returned ${response.status}.`);
      return response.json() as Promise<Snapshot>;
    };
    void (async () => {
      let snapshot: Snapshot | null = null;
      try { snapshot = await viaSdk(); } catch { snapshot = null; }
      if (!snapshot) snapshot = await viaUrl();
      if (!snapshot?.draft) throw new Error("The published snapshot did not include a playbook.");
      return snapshot;
    })()
      .then((snapshot) => applySnapshot(snapshot.id, snapshot.draft))
      .catch((error) => { if (!cancelled) { setWorkerLoadError(error instanceof Error ? error.message : "The shared playbook could not be loaded."); setWorkerShareLoaded(true); } });
    return () => { cancelled = true; };
  }, [initialWorkerLink, initialShareUrl, initialPlaybookSlug, initialWorkerPayload, identity?.userToken]);
  const qty = useMemo(
    () => ({
      syrup: 30 * servings,
      pearls: 60 * servings,
      tea: 120 * servings,
      milk: 100 * servings,
      ice: 120 * servings,
    }),
    [servings],
  );
  useEffect(() => {
    if (!qrOpen) return;
    const playbookId = selectedRecipe === "generated" && activeRecordId ? activeRecordId : "brown-sugar-milk-tea";
    const activeRecord = playbookRecords.find((record) => record.id === playbookId);
    // The scanning phone has no session, so the link has to name the app or
    // the shell drops the worker on its application picker. Version is
    // deliberately left off: a printed QR should follow whatever is published,
    // never pin a station to the build that was current when it was printed.
    const params = new URLSearchParams();
    params.set("appid", new URLSearchParams(window.location.search).get("appid") || APP_ID);
    params.set("playbook", playbookId);
    params.set("mode", "worker");
    const draftForLink = playbookId === "brown-sugar-milk-tea" ? null : activeRecord?.draft || generatedDraft;
    void (async () => {
      if (draftForLink) {
        try { params.set("d", await encodeWorkerPayload(draftForLink)); }
        catch { if (activeRecord?.shareUrl) params.set("source", activeRecord.shareUrl); }
      } else if (activeRecord?.shareUrl) {
        params.set("source", activeRecord.shareUrl);
      }
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      setQrLinkUrl(url);
      setQrCopied(false);
      await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#1d2822", light: "#ffffff" },
    })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    })();
  }, [qrOpen, activeRecordId, selectedRecipe, playbookRecords, generatedDraft]);
  const allPlaybooks = useMemo(
    () => activeLocation === "boba-bloom" ? cards : createdLocations.find((location) => location.id === activeLocation)?.playbooks || [],
    [activeLocation, createdLocations],
  );
  // Boba Bloom is the seeded location and is not in createdLocations, so
  // without this every one of its playbooks was labelled "Restaurant".
  const activeCuisine = useMemo(
    () => activeLocation === "boba-bloom"
      ? "Boba café"
      : createdLocations.find((location) => location.id === activeLocation)?.cuisine || "Restaurant",
    [activeLocation, createdLocations],
  );
  const activeCompletionRecords = completionRecords.filter((record) => (record.locationId || "boba-bloom") === activeLocation);
  const recordForTitle = (title: string) => playbookRecords.find((record) => record.locationId === activeLocation && record.draft.title === title);
  const queryMatches = ([title, station]: string[]) =>
    `${title} ${station}`
      .toLocaleLowerCase()
      .includes(playbookQuery.trim().toLocaleLowerCase());
  const persistSharedState = async (draft: GeneratedDraft | null, status: "draft" | "published", completions = completionRecords, records = playbookRecords) => {
    if (!isConnected || !identity?.userToken) {
      setCloudStatus("local");
      return;
    }
    setCloudStatus("syncing");
    try {
      await withStagingStore(identity.userToken, async (client) => {
        const directory = await client.fsStat("playbook");
        if (!directory.exists) await client.fsMkdir("playbook");
        await client.fsWriteJson(SHARED_STATE_PATH, {
          draft,
          status,
          completions,
          locations: createdLocations,
          goals,
          team: teamMembers,
          shiftChecks,
          closingChecks,
          checklistProgress,
          playbooks: records,
          runMetrics,
          updatedAt: new Date().toISOString(),
        } satisfies SharedPlaybookState);
      });
      setCloudStatus("synced");
    } catch {
      setCloudStatus("error");
    }
  };
  useEffect(() => {
    if (!cloudLoaded || !isConnected || !identity?.userToken) return;
    const timeout = window.setTimeout(() => {
      void persistSharedState(generatedDraft, draftStatus, completionRecords);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [cloudLoaded, createdLocations, goals, teamMembers, checklistProgress, playbookRecords, runMetrics]);
  const recordRunMetric = (source: RunMetric["source"], status: RunMetric["status"], startedAt: number) => {
    setRunMetrics((metrics) => [{ source, status, durationMs: Math.round(performance.now() - startedAt), completedAt: new Date().toISOString() }, ...metrics].slice(0, 25));
  };
  const activateNewDraft = (draft: GeneratedDraft, locationId = activeLocation) => {
    const record: PlaybookRecord = {
      id: crypto.randomUUID(),
      locationId,
      status: "draft",
      version: 1,
      draft,
      updatedAt: new Date().toISOString(),
    };
    setActiveRecordId(record.id);
    setGeneratedDraft(draft);
    setDraftStatus("draft");
    setPlaybookRecords((records) => {
      const next = [...records, record];
      void persistSharedState(draft, "draft", completionRecords, next);
      return next;
    });
  };
  const cancelProcessing = async () => {
    const client = activeClient.current;
    const token = activeToken.current;
    activeClient.current = null;
    activeToken.current = null;
    if (client && token) await client.terminate(token).catch(() => undefined);
    if (client) await client.disconnect().catch(() => undefined);
    setProcessing(false);
    setProcessingState(null);
  };
  const create = async (file: File) => {
    const startedAt = performance.now();
    retryInput.current = { file, kind: "video" };
    setWarningsAcknowledged(false);
    setFileName(file.name);
    if (!VIDEO_TYPES.has(file.type)) {
      setProcessingState({ phase: "error", progress: 0, title: "Unsupported video", detail: "Choose an MP4, MOV, or WEBM file." });
      setModal(false);
      setProcessing(true);
      return;
    }
    if (!file.size || file.size > MAX_VIDEO_BYTES) {
      setProcessingState({ phase: "error", progress: 0, title: "Video is too large", detail: "Choose a non-empty video smaller than 250 MB." });
      setModal(false);
      setProcessing(true);
      return;
    }
    // Say something the moment a file is chosen. Reading the duration can take
    // seconds, and showing nothing made a working app look frozen.
    setModal(false);
    setProcessing(true);
    setProcessingState({ phase: "uploading", progress: 4, title: `Checking ${file.name}…`, detail: "Reading the recording before any processing starts" });
    try {
      const duration = await readVideoDuration(file);
      if (Number.isFinite(duration) && (duration <= 0 || duration > MAX_VIDEO_SECONDS)) {
        throw new Error("Choose a video between 1 second and 5 minutes long.");
      }
      if (!isConnected || !identity?.userToken) {
        throw new Error("Connect and sign in to RocketRide staging before processing a video.");
      }
      setProcessingState({ phase: "uploading", progress: 8, title: `Uploading ${file.name}…`, detail: "Preparing a secure RocketRide run" });
      const client = new RocketRideClient({
        auth: identity.userToken,
        uri: "https://staging.rocketride.ai",
        requestTimeout: 180_000,
      });
      activeClient.current = client;
      await client.connect();
      setProcessingState({ phase: "analyzing", progress: 18, title: `Analyzing ${file.name}…`, detail: "Starting scene and transcript extraction" });
      const { token } = await client.use({
        pipeline: processVideoPipeline as unknown as PipelineConfig,
        source: "webhook_1",
        ttl: 300,
        pipelineTraceLevel: "summary",
        name: `Playbook · ${file.name}`,
      });
      activeToken.current = token;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await client.send(
        token,
        bytes,
        { name: file.name, duration_seconds: Math.round(duration) },
        file.type,
        async (type) => {
          const progress = type.includes("answer") ? 88 : type.includes("text") ? 68 : 42;
          setProcessingState({ phase: "analyzing", progress, title: `Analyzing ${file.name}…`, detail: type.includes("answer") ? "Structuring the review draft" : "Transcribing the narration and pulling out measurements" });
        },
      );
      if (!result) throw new Error("RocketRide finished without returning a draft.");
      const runError = pipelineErrorMessage(result);
      if (runError) throw new Error(`RocketRide could not process this video: ${runError}`);
      const draft = { ...normalizeDraft(result, file.name), kind: createKind || normalizeDraft(result, file.name).kind };
      if (!draft.steps.length && !draft.ingredients.length) {
        throw new Error("No steps or measurements were recovered from this video. Playbook listens to the narration, so reshoot with the process talked through out loud.");
      }
      activateNewDraft(draft);
      localStorage.setItem("playbook-latest-pipeline-result", JSON.stringify({ fileName: file.name, createdAt: new Date().toISOString(), result }));
      localStorage.setItem("playbook-latest-draft", JSON.stringify(draft));
      setProcessingState({ phase: "ready", progress: 100, title: "Draft ready for review", detail: `${file.name} was processed by RocketRide. Review and approve its measurements next.` });
      setSection("Playbooks");
      setReviewOpen(true);
      recordRunMetric("video", "success", startedAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The RocketRide run failed.";
      setModal(false);
      setProcessing(true);
      setProcessingState({ phase: "error", progress: 0, title: "Could not create the draft", detail: message });
      recordRunMetric("video", "error", startedAt);
    } finally {
      const client = activeClient.current;
      const token = activeToken.current;
      activeClient.current = null;
      activeToken.current = null;
      if (client && token) await client.terminate(token).catch(() => undefined);
      if (client) await client.disconnect().catch(() => undefined);
    }
  };
  const createFromInstructionImage = async (file: File) => {
    const startedAt = performance.now();
    retryInput.current = { file, kind: "image" };
    setWarningsAcknowledged(false);
    setFileName(file.name);
    if (!IMAGE_TYPES.has(file.type)) {
      setProcessingState({ phase: "error", progress: 0, title: "Unsupported image", detail: "Choose a JPG, PNG, or WEBP image." });
      setModal(false);
      setProcessing(true);
      return;
    }
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      setProcessingState({ phase: "error", progress: 0, title: "Image is too large", detail: "Choose a non-empty image smaller than 15 MB." });
      setModal(false);
      setProcessing(true);
      return;
    }
    try {
      if (!isConnected || !identity?.userToken) throw new Error("Connect and sign in to RocketRide staging before analyzing instructions.");
      setModal(false);
      setProcessing(true);
      setProcessingState({ phase: "uploading", progress: 10, title: `Uploading ${file.name}…`, detail: "Preparing written-instruction analysis" });
      const client = new RocketRideClient({ auth: identity.userToken, uri: "https://staging.rocketride.ai", requestTimeout: 180_000 });
      activeClient.current = client;
      await client.connect();
      setProcessingState({ phase: "analyzing", progress: 25, title: `Reading ${file.name}…`, detail: "Transcribing measurements, steps, warnings, and timers" });
      const { token } = await client.use({
        pipeline: processInstructionsPipeline as unknown as PipelineConfig,
        source: "webhook_1",
        ttl: 300,
        pipelineTraceLevel: "summary",
        name: `Written instructions · ${file.name}`,
      });
      activeToken.current = token;
      const result = await client.send(
        token,
        new Uint8Array(await file.arrayBuffer()),
        { name: file.name, source_type: "written_instructions" },
        file.type,
        async (type) => setProcessingState({
          phase: "analyzing",
          progress: type.includes("answer") ? 90 : 58,
          title: `Reading ${file.name}…`,
          detail: type.includes("answer") ? "Structuring the owner-review draft" : "Extracting visible instructions without guessing",
        }),
      );
      if (!result) throw new Error("RocketRide finished without returning a draft.");
      const runError = pipelineErrorMessage(result);
      if (runError) throw new Error(`RocketRide could not read this image: ${runError}`);
      const draft = { ...normalizeDraft(result, file.name), kind: createKind || normalizeDraft(result, file.name).kind };
      if (!draft.steps.length && !draft.ingredients.length) {
        throw new Error("No steps or measurements were readable in this image. Retake the photo in better light, filling the frame with the written instructions.");
      }
      activateNewDraft(draft);
      localStorage.setItem("playbook-latest-pipeline-result", JSON.stringify({ fileName: file.name, createdAt: new Date().toISOString(), result }));
      localStorage.setItem("playbook-latest-draft", JSON.stringify(draft));
      localStorage.setItem("playbook-latest-draft-status", "draft");
      setProcessingState({ phase: "ready", progress: 100, title: "Written instructions ready for review", detail: "Verify every measurement and safety detail against the original image before publishing." });
      setSection("Playbooks");
      setReviewOpen(true);
      recordRunMetric("image", "success", startedAt);
    } catch (error) {
      setProcessingState({ phase: "error", progress: 0, title: "Could not analyze the instructions", detail: error instanceof Error ? error.message : "The RocketRide run failed." });
      setModal(false);
      setProcessing(true);
      recordRunMetric("image", "error", startedAt);
    } finally {
      const client = activeClient.current;
      const token = activeToken.current;
      activeClient.current = null;
      activeToken.current = null;
      if (client && token) await client.terminate(token).catch(() => undefined);
      if (client) await client.disconnect().catch(() => undefined);
    }
  };
  const inviteTeamMember = (event: React.FormEvent) => {
    event.preventDefault();
    const name = inviteName.trim();
    if (!name || !inviteEmail.trim()) return;
    if (teamMembers.some((member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase() || member.email?.toLocaleLowerCase() === inviteEmail.trim().toLocaleLowerCase())) {
      setInviteError("That team member or email is already on the roster.");
      return;
    }
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    setTeamMembers((members) => [
      ...members,
      {
        name,
        email: inviteEmail.trim().toLocaleLowerCase(),
        role: inviteRole,
        initials,
        progress: 0,
        completed: "0 of 4",
        status: "In progress",
        accomplishments: [],
      },
    ]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Barista");
    setInviteError("");
    setInviteOpen(false);
  };
  const updateDraft = (patch: Partial<GeneratedDraft>) => {
    setGeneratedDraft((draft) => draft ? { ...draft, ...patch } : draft);
    setReviewError("");
  };
  const startBasicPlaybook = () => {
    const kind = createKind || "task";
    const operational = kind === "opening" || kind === "closing" || kind === "cleaning";
    const labels = { recipe: "New Recipe", batch: "New Batch Preparation", opening: "New Opening Checklist", closing: "New Closing Checklist", cleaning: "New Cleaning Checklist", task: "New Task" };
    const steps = kind === "opening" ? ["Complete safety walk", "Record cold-storage temperatures", "Inspect and start equipment", "Stock and sign off the station"] : kind === "closing" ? ["Secure or discard food", "Record final temperatures", "Clean and power down equipment", "Complete closing walk and sign off"] : kind === "cleaning" ? ["Remove exposed food", "Wash and rinse surfaces", "Sanitize for the labeled contact time", "Air-dry, inspect, and sign the log"] : [];
    const draft: GeneratedDraft = { kind, title: labels[kind], station: "Unassigned station", assignee: operational ? "Shift lead" : "Assigned team member", frequency: operational ? "Every operating day" : "As scheduled", ingredients: operational ? ["Required PPE", "Approved sanitizer and test strips", "Clean food-safe tools"] : [], steps, timers: [], safetyChecks: operational ? ["Follow chemical labels and required contact time", "Escalate unsafe equipment or food immediately"] : [], qualityCues: [], warnings: ["Complete and verify every required field before publishing."], sourceFile: `Basic ${kind} template`, createdAt: new Date().toISOString() };
    activateNewDraft(draft);
    setModal(false);
    setReviewOpen(true);
  };
  const useRestaurantTemplate = (template: RestaurantTemplate, locationId = activeLocation) => {
    setWarningsAcknowledged(false);
    const { id, cuisine, duration, ...draftFields } = template;
    const draft: GeneratedDraft = {
      ...draftFields,
      kind: template.kind || inferPlaybookKind(template.title, template.station),
      assignee: template.assignee || "Certified station team",
      frequency: template.frequency || "As scheduled",
      ingredients: [...template.ingredients],
      steps: [...template.steps],
      timers: [...template.timers],
      safetyChecks: [...template.safetyChecks],
      qualityCues: [...template.qualityCues],
      warnings: [...template.warnings],
      sourceFile: `Template · ${cuisine}`,
      createdAt: new Date().toISOString(),
    };
    activateNewDraft(draft, locationId);
    localStorage.setItem("playbook-latest-draft", JSON.stringify(draft));
    localStorage.setItem("playbook-latest-draft-status", "draft");
    setModal(false);
    setTemplateQuery("");
    setSection("Playbooks");
    setReviewOpen(true);
  };
  const useLocationStarter = (starter: LocationStarter) => {
    const primary = restaurantTemplates.find((template) => template.id === starter.primaryTemplateId);
    if (!primary) return;
    setCreatedLocations((locations) => locations.some((location) => location.id === starter.id) ? locations : [...locations, starter]);
    setActiveLocation(starter.id);
    const existing = playbookRecords.find((record) => record.locationId === starter.id && record.draft.title === primary.title);
    if (existing) {
      setActiveRecordId(existing.id);
      setGeneratedDraft(existing.draft);
      setDraftStatus(existing.status);
      setSelectedRecipe("generated");
      setGeneratedDone([]);
      setCompletionSaved(false);
      setModal(false);
      if (existing.status === "published") setPage("recipe"); else setReviewOpen(true);
      return;
    }
    useRestaurantTemplate(primary, starter.id);
  };
  const createLocationFromStarter = (starter: LocationStarter) => {
    const name = newLocationName.trim();
    if (!name) return;
    const location = { ...starter, id: `location-${slugify(name)}-${Date.now().toString(36)}`, name };
    setNewLocationName("");
    setTemplateQuery("");
    setSelectedLocationTemplateId(locationStarters[0]?.id || "");
    setLocationModalOpen(false);
    setCreatedLocations((locations) => [...locations, location]);
    setActiveLocation(location.id);
    setSection("Home");
    setPage("home");
  };
  const openLocationPlaybook = (playbook: string[]) => {
    setWarningsAcknowledged(false);
    const existing = playbookRecords.find((record) => record.locationId === activeLocation && record.draft.title === playbook[0]);
    const existingIsGeneric = existing?.draft.ingredients.some((item) => /approved recipe or batch sheet/i.test(item)) || existing?.draft.steps.some((step) => /verify every ingredient against the approved batch sheet/i.test(step));
    const existingIsComplete = existing && !existingIsGeneric && existing.draft.steps.length >= 4 && existing.draft.ingredients.length >= 2 && existing.draft.safetyChecks.length >= 1;
    // Published content is the owner's approved work and is never rewritten —
    // except legacy filler, which was never really reviewed and still repairs.
    if (existing && (existingIsComplete || (existing.status === "published" && !existingIsGeneric))) {
      setActiveRecordId(existing.id);
      setGeneratedDraft(existing.draft);
      setDraftStatus(existing.status);
      setSelectedRecipe("generated");
      setGeneratedDone([]);
      setCompletionSaved(false);
      if (existing.status === "published") setPage("recipe"); else setReviewOpen(true);
      return;
    }
    const title = playbook[0];
    const isOpening = /open|opening|setup/i.test(title);
    const isClosing = /close|closing/i.test(title);
    const isCleaning = /clean|sanitize/i.test(`${title} ${playbook[1]}`);
    const exactTemplate = restaurantTemplates.find((template) => template.title === title);
    const isTapioca = /tapioca pearl batch/i.test(title);
    const isJasmineTea = /jasmine milk tea batch/i.test(title);
    const ingredients = isTapioca
      ? ["Dry black tapioca pearls — 1,000 g", "Filtered water — 8 L", "Dark brown sugar — 500 g", "Hot water for syrup — 500 ml"]
      : isJasmineTea
        ? ["Loose-leaf jasmine tea — 40 g", "Filtered water — 2 L", "Cane sugar — 300 g", "Whole milk — 1 L"]
        : exactTemplate
          ? [...exactTemplate.ingredients]
          : isOpening || isClosing || isCleaning
      ? ["Location keys and opening/closing log", "Calibrated thermometer", "Approved sanitizer and test strips", "Clean towels and required PPE"]
      : [`${title} — ingredient list from this location's approved batch sheet`, "Labeled, date-marked food-safe containers", "Calibrated scale and thermometer", "Sanitized tools for this station"];
    const steps = isTapioca
      ? ["Wash hands; sanitize the cooker, strainer, scale, and storage pan", "Bring 8 L filtered water to a rolling boil", "Add 1,000 g tapioca pearls slowly while stirring to prevent clumps", "Return to a boil, cover, and cook for 30 minutes; stir every 5 minutes", "Turn off heat and rest covered for 30 minutes", "Drain and rinse briefly with potable lukewarm water", "Dissolve 500 g dark brown sugar in 500 ml hot water; fold syrup into pearls", "Label the batch with its finish time, hold covered, and discard at this location's approved hold limit"]
      : isJasmineTea
        ? ["Wash hands and sanitize the pitcher, strainer, and stirring utensil", "Heat 2 L filtered water to 195°F / 91°C", "Steep 40 g jasmine tea for 8 minutes", "Strain immediately and stir in 300 g cane sugar until dissolved", "Cool to 41°F / 5°C or below within 4 hours", "Add 1 L whole milk, mix thoroughly, then label, date, and refrigerate"]
        : exactTemplate
          ? [...exactTemplate.steps]
          : isOpening
      ? [...openingStepsFor(activeCuisine)]
      : isClosing
        ? [...closingStepsFor(activeCuisine)]
        : isCleaning
          ? ["Post the cleaning sign and remove exposed food", "Wash removable parts with approved detergent", "Rinse with clean potable water", "Sanitize using the labeled concentration and contact time", "Air-dry all food-contact parts", "Reassemble, inspect, and sign the cleaning log"]
        : ["Wash hands and sanitize the station before starting", `Gather every ingredient for ${title} and check each one against the approved batch sheet`, "Weigh or measure each ingredient with the assigned tools and record the amounts", `Work through the ${title} sequence in order, without substituting ingredients or skipping steps`, "Verify time, temperature, and the finished quality standard before releasing the batch", "Label with the product name, preparation time, and discard time, then store and record the batch"];
    const draft: GeneratedDraft = {
      kind: isOpening ? "opening" : isClosing ? "closing" : isCleaning ? "cleaning" : /batch|prep/i.test(`${title} ${playbook[1]}`) ? "batch" : exactTemplate ? "recipe" : "task",
      assignee: isOpening ? "Opening shift lead" : isClosing ? "Closing shift lead" : /batch|prep/i.test(`${title} ${playbook[1]}`) ? "Prep lead" : "Assigned team member",
      frequency: isOpening || isClosing ? "Every operating day" : /batch|prep/i.test(`${title} ${playbook[1]}`) ? "Every batch" : "As assigned",
      title,
      station: playbook[1],
      ingredients,
      steps,
      timers: isTapioca ? ["Cook 30 minutes", "Rest 30 minutes", "Discard at the location hold limit — starter value 4 hours"] : isJasmineTea ? ["Steep 8 minutes", "Cool to 41°F / 5°C within 4 hours"] : exactTemplate ? [...exactTemplate.timers] : [isOpening ? "Complete before the location opens" : isClosing ? "Complete before the final employee leaves" : `Target duration: ${playbook[2]}`],
      safetyChecks: isTapioca ? ["Use heat-resistant gloves around boiling water", "Keep the pot stable and use safe lifting technique", "Confirm this location's hold limit for cooked pearls before the first batch — the starter value is 4 hours from finishing"] : isJasmineTea ? ["Milk and finished tea must remain at 41°F / 5°C or below", "Use the approved rapid-cooling method", "Label the preparation and discard dates"] : exactTemplate ? [...exactTemplate.safetyChecks] : ["Record cold holding at 41°F / 5°C or below", "Follow chemical labels and required sanitizer contact time", "Escalate unsafe equipment or out-of-range food immediately"],
      qualityCues: isTapioca ? ["Pearls are glossy and chewy through the center, with no hard core or mushy exterior"] : isJasmineTea ? ["Floral aroma, pale tan color, smooth body, and no tea leaves"] : exactTemplate ? [...exactTemplate.qualityCues] : [isOpening ? "Station is stocked, clean, logged, and ready for service" : isClosing ? "Food is secured, equipment is off, and the signed station is clean" : `${title} matches this location's approved standard for appearance, texture, and portion`],
      warnings: isTapioca || isJasmineTea ? ["Owner must verify these starter quantities, times, temperatures, and hold limits against the location's approved recipe before publishing. They were written as a starting point, not measured at this location."] : exactTemplate ? [...exactTemplate.warnings] : [`Starter scaffold for ${title}: add this location's exact quantities, equipment settings, and times before publishing.`],
      sourceFile: `Location starter · ${activeCuisine}`,
      createdAt: new Date().toISOString(),
    };
    if (existing) {
      const repaired = { ...existing, draft, status: "draft" as const, updatedAt: new Date().toISOString() };
      const nextRecords = playbookRecords.map((record) => record.id === existing.id ? repaired : record);
      setPlaybookRecords(nextRecords);
      setActiveRecordId(existing.id);
      setGeneratedDraft(draft);
      setDraftStatus("draft");
      void persistSharedState(draft, "draft", completionRecords, nextRecords);
    } else {
      activateNewDraft(draft);
    }
    setSelectedRecipe("generated");
    setReviewOpen(true);
  };
  const publishWorkerSnapshot = async (recordId: string, draft: GeneratedDraft, version: number) => {
    if (!identity?.userToken) return;
    try {
      const shareUrl = await withStagingStore(identity.userToken, async (client) => {
        const root = await client.fsStat("playbook");
        if (!root.exists) await client.fsMkdir("playbook");
        const directory = await client.fsStat("playbook/public");
        if (!directory.exists) await client.fsMkdir("playbook/public");
        const path = `playbook/public/${recordId}.json`;
        await client.fsWriteJson(path, { id: recordId, draft, version, publishedAt: new Date().toISOString() });
        return client.fsGetUrl(path, 7 * 24 * 60 * 60);
      });
      setPlaybookRecords((records) => {
        const next = records.map((record) => record.id === recordId ? { ...record, shareUrl } : record);
        void persistSharedState(draft, "published", completionRecords, next);
        return next;
      });
    } catch {
      setProcessing(true);
      setProcessingState({ phase: "error", progress: 0, title: "Published, but QR sharing failed", detail: "The owner copy is saved. Retry publishing before printing the worker QR." });
    }
  };
  const saveDraft = (publish = false) => {
    if (!generatedDraft) return;
    const kind = generatedDraft.kind || inferPlaybookKind(generatedDraft.title, generatedDraft.station);
    const missing = [
      !generatedDraft.title.trim() && "a title",
      !generatedDraft.station.trim() && "a station",
      (kind === "recipe" || kind === "batch") && generatedDraft.ingredients.length === 0 && "ingredient amounts",
      (kind === "opening" || kind === "closing" || kind === "cleaning" || kind === "task") && !generatedDraft.assignee?.trim() && "a responsible role",
      !generatedDraft.frequency?.trim() && "a frequency or due window",
      generatedDraft.steps.length === 0 && "at least one step",
      generatedDraft.safetyChecks.length === 0 && "at least one safety check",
      publish && generatedDraft.warnings.length > 0 && !warningsAcknowledged && "confirmation of every review warning",
    ].filter(Boolean);
    if (publish && missing.length) {
      setReviewError(`Add ${missing.join(", ")} before publishing.`);
      return;
    }
    const saved = { ...generatedDraft, warnings: publish ? [] : generatedDraft.warnings };
    setGeneratedDraft(saved);
    localStorage.setItem("playbook-latest-draft", JSON.stringify(saved));
    localStorage.setItem("playbook-latest-draft-status", publish ? "published" : "draft");
    const nextStatus: PlaybookRecord["status"] = publish ? "published" : "draft";
    setDraftStatus(nextStatus);
    let publishedVersion = 1;
    const recordId = activeRecordId || crypto.randomUUID();
    if (!activeRecordId) setActiveRecordId(recordId);
    const nextRecords = playbookRecords.some((record) => record.id === recordId)
      ? playbookRecords.map((record) => record.id === recordId ? {
        ...record,
        draft: saved,
        status: nextStatus,
        version: publish ? (publishedVersion = record.version + 1) : record.version,
        updatedAt: new Date().toISOString(),
      } : record)
      : [...playbookRecords, {
        id: recordId,
        locationId: activeLocation,
        status: nextStatus,
        version: publishedVersion,
        draft: saved,
        updatedAt: new Date().toISOString(),
      }];
    setPlaybookRecords(nextRecords);
    void persistSharedState(saved, nextStatus, completionRecords, nextRecords);
    if (publish) void publishWorkerSnapshot(recordId, saved, publishedVersion);
    setProcessing(true);
    setProcessingState({
      phase: "ready",
      progress: 100,
      title: publish ? "Playbook published" : "Draft saved",
      detail: publish ? `${saved.title} is ready for worker review and QR access.` : `${saved.title} is saved for continued owner review.`,
    });
    setReviewOpen(false);
    setSection("Playbooks");
  };
  const navigate = (target: string) => {
    setSection(target);
    setPage("home");
  };
  const completeGeneratedPlaybook = () => {
    if (!generatedDraft || generatedDone.length < generatedDraft.steps.length) return;
    const record: CompletionRecord = {
      playbook: generatedDraft.title,
      playbookId: activeRecordId || undefined,
      locationId: activeLocation,
      kind: "playbook",
      completedAt: new Date().toISOString(),
      worker: identity?.displayName || "Team member",
    };
    const nextRecords = [record, ...completionRecords].slice(0, 25);
    setCompletionRecords(nextRecords);
    void persistSharedState(generatedDraft, "published", nextRecords);
    setCompletionSaved(true);
  };
  const completeDefaultPlaybook = () => {
    if (defaultStepDone.length < copy.English.length || done.length < 3 || defaultCompletionSaved) return;
    const record: CompletionRecord = {
      playbook: "Brown Sugar Milk Tea",
      playbookId: "brown-sugar-milk-tea",
      locationId: activeLocation,
      kind: "playbook",
      completedAt: new Date().toISOString(),
      worker: identity?.displayName || "Maya Tran",
    };
    const nextRecords = [record, ...completionRecords].slice(0, 50);
    setCompletionRecords(nextRecords);
    void persistSharedState(generatedDraft, draftStatus, nextRecords);
    setDefaultCompletionSaved(true);
  };
  const resetActiveChecklist = () => setChecklistProgress((progress) => ({
    ...progress,
    [activeLocation]: {
      ...(progress[activeLocation] || { opening: [], closing: [] }),
      [activeChecklist]: [],
    },
  }));
  const removeSelectedMember = () => {
    if (!selectedMember || selectedMember.role === "Owner") return;
    if (!window.confirm(`Remove ${selectedMember.name} from the team roster? Their historical completion records will be retained.`)) return;
    setTeamMembers((members) => members.filter((member) => member.name !== selectedMember.name));
    setSelectedMember(null);
  };
  const certifySelectedMember = () => {
    if (!selectedMember) return;
    const updated = { ...selectedMember, status: "Certified" as const, progress: 100, completed: "4 of 4" };
    setTeamMembers((members) => members.map((member) => member.name === selectedMember.name ? updated : member));
    setSelectedMember(updated);
  };
  const deleteActiveDraft = () => {
    if (!activeRecordId || draftStatus !== "draft") return;
    if (!window.confirm("Delete this draft? Published playbooks and completion history will not be affected.")) return;
    const nextRecords = playbookRecords.filter((record) => record.id !== activeRecordId);
    setPlaybookRecords(nextRecords);
    setActiveRecordId(null);
    setGeneratedDraft(null);
    setReviewOpen(false);
    setWarningsAcknowledged(false);
    void persistSharedState(null, "draft", completionRecords, nextRecords);
  };
  const sidebar = (
    <aside className="side">
      <div className="brand">
        <b>
          <Icon name="spark" />
        </b>
        <strong>Playbook</strong>
      </div>
      <label className="shop">
        <i>{activeLocation === "boba-bloom" ? "B" : createdLocations.find((location) => location.id === activeLocation)?.cuisine[0] || "R"}</i>
        <span>
          <small>ACTIVE LOCATION</small>
          <select value={activeLocation} onChange={(event) => { setActiveLocation(event.target.value); setSection("Home"); setPage("home"); }}>
            <option value="boba-bloom">Boba Bloom</option>
            {createdLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </span>
      </label>
      <nav>
        {(
          [
            ["grid", "Home"],
            ["book", "Playbooks"],
            ["team", "Team"],
            ["check", "Tasks"],
            ["spark", "Goals"],
            ["settings", "Settings"],
          ] as [IconName, string][]
        ).map(([i, t]) => (
          <button
            className={section === t ? "active" : ""}
            onClick={() => navigate(t)}
            key={t}
          >
            <Icon name={i} />
            <span>{t}</span>
          </button>
        ))}
      </nav>
      <div className="sidefoot">
        <button className="person person-button" type="button" onClick={() => setProfileOpen(true)} aria-label="Open owner profile">
          <b>{(identity?.displayName || "Maya Tran").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase()}</b>
          <span>
            <strong>{identity?.displayName || "Maya Tran"}</strong>
            <small>Owner</small>
          </span>
          <Icon name="more" />
        </button>
      </div>
    </aside>
  );

  const processingBanner = processing && processingState && (
    <div className={`processing processing-${processingState.phase}`} role="status">
      <b>
        <Icon name={processingState.phase === "error" ? "close" : "spark"} />
      </b>
      <span>
        <strong>{processingState.title}</strong>
        <small>{processingState.detail}</small>
      </span>
      <i>
        <em style={{ width: `${processingState.progress}%` }} />
      </i>
      <strong>
        {processingState.phase === "error" ? "Needs attention" : `${processingState.progress}%`}
      </strong>
      {processingState.phase === "error" && retryInput.current && (
        <button className="retry-button" onClick={() => {
          const retry = retryInput.current;
          if (!retry) return;
          if (retry.kind === "video") void create(retry.file);
          else void createFromInstructionImage(retry.file);
        }}>Retry</button>
      )}
      <button
        onClick={() => {
          if (processingState.phase === "uploading" || processingState.phase === "analyzing") {
            void cancelProcessing();
          } else {
            setProcessing(false);
            setProcessingState(null);
          }
        }}
        aria-label={processingState.phase === "uploading" || processingState.phase === "analyzing" ? "Cancel processing" : "Dismiss status"}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );

  const home = (
    <main className="main">
      <header>
        <div>
          <h1>
            Good morning, {(identity?.displayName || "Maya Tran").split(" ")[0]} <span>👋</span>
          </h1>
          <p>Here’s what’s happening at {activeLocation === "boba-bloom" ? "Boba Bloom" : createdLocations.find((location) => location.id === activeLocation)?.name || "this location"} today.</p>
        </div>
        <div className="actions"><button className="primary" onClick={() => setModal(true)}><Icon name="plus" /> Create playbook</button></div>
      </header>
      {processingBanner}
      <section className="stats">
        <div>
          <small>ACTIVE PLAYBOOKS</small>
          <b>{(activeLocation === "boba-bloom" ? 1 : 0) + playbookRecords.filter((record) => record.locationId === activeLocation && record.status === "published").length}</b>
          <em>published</em>
        </div>
        <div>
          <small>RECORDED COMPLETIONS</small>
          <b>{activeCompletionRecords.length}</b>
          <em>worker runs</em>
        </div>
        <div>
          <small>SHIFT READINESS</small>
          <b>{Math.round(((shiftChecks.length + closingChecks.length) / 16) * 100)}%</b>
          <em>open {shiftChecks.length}/8 · close {closingChecks.length}/8</em>
        </div>
        <div>
          <small>NEEDS REVIEW</small>
          <b>{playbookRecords.filter((record) => record.locationId === activeLocation && record.status === "draft").length}</b>
          <em className={playbookRecords.some((record) => record.locationId === activeLocation && record.status === "draft") ? "warning" : ""}>{playbookRecords.some((record) => record.locationId === activeLocation && record.status === "draft") ? "Owner review required" : "Nothing waiting"}</em>
        </div>
      </section>
      <div className="section-title">
        <span>
          <h2>Your playbooks</h2>
          <p>Everything your team needs to do it right, every time.</p>
        </span>
        <label>
          <Icon name="search" />
          <input
            aria-label="Search playbooks"
            placeholder="Search playbooks"
            value={playbookQuery}
            onChange={(event) => setPlaybookQuery(event.target.value)}
          />
        </label>
      </div>
      <section className="cardgrid">
        {playbookRecords
          .filter((record) => record.locationId === activeLocation && !allPlaybooks.some((card) => card[0] === record.draft.title) && queryMatches([record.draft.title, record.draft.station]))
          .map((record) => (
            <button className="playbook-card" onClick={() => {
              setActiveRecordId(record.id);
              setGeneratedDraft(record.draft);
              setDraftStatus(record.status);
              setGeneratedDone([]);
              setCompletionSaved(false);
              setServings(1);
              setWarningsAcknowledged(false);
              if (record.status === "published") { setSelectedRecipe("generated"); setPage("recipe"); } else setReviewOpen(true);
            }} key={record.id}>
              <div className={`cover ${coverArtFor(record.draft.title)}`}>
                <span>{record.draft.station}</span>
                <div className="cup"><i /><b /></div>
                <em><Icon name="clock" size={13} />{record.draft.steps.length} steps</em>
              </div>
              <div className="cardbody">
                <div>
                  <h3>{record.draft.title}</h3>
                  <b className={record.status === "published" ? "" : "draft"}>{record.status === "published" ? "Published" : "Needs review"}</b>
                </div>
                <p>From {record.draft.sourceFile}</p>
                <footer>
                  <i>{(identity?.displayName || "Owner").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</i>
                  <span>Updated {new Date(record.updatedAt).toLocaleDateString()}</span>
                  ›
                </footer>
              </div>
            </button>
          ))}
        {allPlaybooks
          .map((card, n) => ({ card, n }))
          .filter(({ card }) => queryMatches(card))
          .map(({ card: [title, station, time, art], n }) => (
            <button className="playbook-card" onClick={() => { if (activeLocation === "boba-bloom" && n === 0) { setSelectedRecipe("default"); setDefaultStepDone([]); setDone([]); setDefaultCompletionSaved(false); setPage("recipe"); } else openLocationPlaybook([title, station, time, art]); }} key={title}>
              <div className={`cover ${coverArtFor(title, art)}`}>
                <span>{station}</span>
                <div className="cup">
                  <i />
                  <b />
                </div>
                <em>
                  <Icon name="clock" size={13} />
                  {time}
                </em>
              </div>
              <div className="cardbody">
                <div>
                  <h3>{title}</h3>
                  <b className={(activeLocation === "boba-bloom" && n === 0) || recordForTitle(title)?.status === "published" ? "" : "draft"}>
                    {activeLocation === "boba-bloom" && n === 0 ? "Published" : recordForTitle(title)?.status === "published" ? "Published" : recordForTitle(title)?.status === "draft" ? "Needs review" : "Starter"}
                  </b>
                </div>
                <p>
                  {recordForTitle(title)?.draft.sourceFile
                    ? `From ${recordForTitle(title)?.draft.sourceFile}`
                    : `${station} · ${time} · starter playbook`}
                </p>
                <footer>
                  <i>{(activeLocation === "boba-bloom" && n === 0) || recordForTitle(title) ? "MT" : "TPL"}</i>
                  <span>{activeLocation === "boba-bloom" && n === 0 ? "Starter recipe · verify before use" : recordForTitle(title) ? `Updated ${new Date(recordForTitle(title)!.updatedAt).toLocaleDateString()}` : "Ready to customize"}</span>
                  ›
                </footer>
              </div>
            </button>
          ))}
        {playbookQuery && !allPlaybooks.some(queryMatches) && (
          <p className="empty-search">No playbooks match “{playbookQuery}”.</p>
        )}
        <button className="new" onClick={() => setModal(true)}>
          <i>
            <Icon name="plus" />
          </i>
          <b>Create a playbook</b>
          <span>Upload a video or record a process</span>
        </button>
      </section>
      <section className="activity">
        <div>
          <h2>Team activity</h2>
        </div>
        {activeCompletionRecords.slice(0, 3).map((record, index) => {
          const initials = record.worker.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase() || "TM";
          return (
          <article key={`${record.worker}-${record.playbook}-${record.completedAt}-${index}`}>
            <i>{initials}</i>
            <span>
              <strong>
                {record.worker} completed <b>{record.playbook}</b>
              </strong>
              <small>
                {record.kind === "checklist" ? "Shift checklist" : "Playbook run"} · {new Date(record.completedAt).toLocaleString()}
              </small>
            </span>
            <em>Done</em>
          </article>
          );
        })}
        {activeCompletionRecords.length === 0 && (starterActivityByLocation[activeLocation] || []).map((activity) => (
          <article key={`starter-${activeLocation}-${activity.worker}-${activity.task}`}>
            <i>{activity.initials}</i>
            <span><strong>{activity.worker} completed <b>{activity.task}</b></strong><small>{activity.detail} · open the Team page for details</small></span>
            <em>Done</em>
          </article>
        ))}
        {activeCompletionRecords.length === 0 && !starterActivityByLocation[activeLocation] && <p className="empty-activity">No activity has been recorded at this location yet.</p>}
      </section>
    </main>
  );

  const generatedDraftMatchesFilters = Boolean(
    generatedDraft &&
    queryMatches([generatedDraft.title, generatedDraft.station]) &&
    (stationFilter === "All stations" || generatedDraft.station === stationFilter) &&
    (statusFilter === "All statuses" || statusFilter.toLocaleLowerCase() === draftStatus),
  );
  const locationRecords = playbookRecords.filter((record) => record.locationId === activeLocation);
  const activePlaybookRecord = activeRecordId ? playbookRecords.find((record) => record.id === activeRecordId) : undefined;
  const currentPlaybookKind = generatedDraft?.kind || inferPlaybookKind(generatedDraft?.title || "", generatedDraft?.station || "");
  const visibleRecords = locationRecords.filter((record) =>
    queryMatches([record.draft.title, record.draft.station]) &&
    (stationFilter === "All stations" || record.draft.station === stationFilter) &&
    (statusFilter === "All statuses" || record.status === statusFilter.toLocaleLowerCase())
  );

  const playbooks = (
    <main className="main collection">
      <header>
        <div>
          <h1>Playbooks</h1>
          <p>One source of truth for every station and every shift. <span className={`cloud-state cloud-${cloudStatus}`}>{cloudStatus === "syncing" ? "Syncing…" : cloudStatus === "synced" ? "Saved to staging" : cloudStatus === "error" ? "Staging sync failed · saved locally" : "Saved locally"}</span></p>
        </div>
        <div className="actions"><button className="primary" onClick={() => setModal(true)}><Icon name="plus" /> Create playbook</button></div>
      </header>
      {processingBanner}
      <div className="list-tools">
        <label>
          <Icon name="search" />
          <input
            aria-label="Search all playbooks"
            placeholder="Search all playbooks"
            value={playbookQuery}
            onChange={(event) => setPlaybookQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter by station"
          value={stationFilter}
          onChange={(event) => setStationFilter(event.target.value)}
        >
          <option>All stations</option>
          {[...new Set([...allPlaybooks.map((playbook) => playbook[1]), ...locationRecords.map((record) => record.draft.station)])].map(
            (station) => (
              <option key={station}>{station}</option>
            ),
          )}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>All statuses</option>
          <option>Published</option>
          <option>Draft</option>
          <option>Starter</option>
        </select>
      </div>
      <section className="table">
        <div className="tablehead">
          <span>PLAYBOOK</span>
          <span>STATION</span>
          <span>STATUS</span>
          <span>OWNER</span>
          <span>UPDATED</span>
          <span />
        </div>
        {visibleRecords.map((record) => (
            <button className="tablerow generated-row" key={record.id} onClick={() => {
              setActiveRecordId(record.id);
              setGeneratedDraft(record.draft);
              setDraftStatus(record.status);
              setGeneratedDone([]);
              setCompletionSaved(false);
              setWarningsAcknowledged(false);
              if (record.status === "published") { setSelectedRecipe("generated"); setPage("recipe"); } else setReviewOpen(true);
            }}>
              <i className={`thumb source-badge kind-${record.draft.kind || inferPlaybookKind(record.draft.title, record.draft.station)}`}>{({ opening: "OPEN", closing: "CLOSE", cleaning: "CLEAN", recipe: "RCP", batch: "BATCH", task: "TASK" } as const)[record.draft.kind || inferPlaybookKind(record.draft.title, record.draft.station)]}</i>
              <span>
                <b>{record.draft.title}</b>
                <small>v{record.version} · {record.draft.sourceFile} · {record.draft.steps.length} steps</small>
              </span>
              <span>{record.draft.station}</span>
              <em className={record.status === "draft" ? "status draft" : "status"}>
                {record.status === "draft" ? "Needs review" : "Published"}
              </em>
              <span><i className="avatar">{(identity?.displayName || "Owner").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</i>{identity?.displayName || "Owner"}</span>
              <span>{new Date(record.updatedAt).toLocaleDateString()}</span>
              <Icon name="more" />
            </button>
          ))}
        {allPlaybooks
          .map((playbook, n) => ({ playbook, n }))
          .filter(({ playbook, n }) => {
            const status = activeLocation === "boba-bloom" && n === 0 ? "Published" : "Starter";
            return (
              !locationRecords.some((record) => record.draft.title === playbook[0]) &&
              queryMatches(playbook) &&
              (stationFilter === "All stations" ||
                playbook[1] === stationFilter) &&
              (statusFilter === "All statuses" || status === statusFilter)
            );
          })
          .map(({ playbook: x, n }) => (
            <button
              className="tablerow"
              key={x[0]}
              onClick={() => { if (activeLocation === "boba-bloom" && n === 0) { setSelectedRecipe("default"); setDefaultStepDone([]); setDone([]); setDefaultCompletionSaved(false); setPage("recipe"); } else openLocationPlaybook(x); }}
            >
              <i className={`thumb ${coverArtFor(x[0], x[3])}`}>
                <span className="source-badge-text">{activeLocation === "boba-bloom" && n === 0 ? "SOP" : "TPL"}</span>
              </i>
              <span>
                <b>{x[0]}</b>
                <small>
                  {x[2]} · {n === 2 ? "18" : "4"} steps
                </small>
              </span>
              <span>{x[1]}</span>
              <em className={activeLocation === "boba-bloom" && n === 0 ? "status" : "status draft"}>
                {activeLocation === "boba-bloom" && n === 0 ? "Published" : "Starter"}
              </em>
              <span>
                <i className="avatar">
                  {activeLocation === "boba-bloom" && n === 0 ? "MT" : "TPL"}
                </i>
                {activeLocation === "boba-bloom" && n === 0 ? "Maya Tran" : "Location template"}
              </span>
              <span>{activeLocation === "boba-bloom" && n === 0 ? "Not yet verified" : "Not yet edited"}</span>
              <Icon name="more" />
            </button>
          ))}
        {visibleRecords.length === 0 && !allPlaybooks
          .map((playbook, n) => ({ playbook, n }))
          .some(({ playbook, n }) => {
            const status = activeLocation === "boba-bloom" && n === 0 ? "Published" : "Starter";
            return (
              !locationRecords.some((record) => record.draft.title === playbook[0]) &&
              queryMatches(playbook) &&
              (stationFilter === "All stations" ||
                playbook[1] === stationFilter) &&
              (statusFilter === "All statuses" || status === statusFilter)
            );
          }) && (
          <p className="empty-search table-empty">
            No playbooks match these filters.
          </p>
        )}
      </section>
    </main>
  );

  const team = (
    <main className="main collection">
      <header>
        <div>
          <h1>Team training</h1>
          <p>
            Assign playbooks, verify skills, and keep every location consistent.
          </p>
        </div>
        <button className="primary" onClick={() => setInviteOpen(true)}>
          <Icon name="plus" /> Add roster member
        </button>
      </header>
      <section className="stats teamstats">
        <div>
          <small>TEAM MEMBERS</small>
          <b>{teamMembers.length}</b>
          <em>
            {teamMembers.filter((member) => member.status !== "Invited").length}{" "}
            active
          </em>
        </div>
        <div>
          <small>TRAINING COMPLETION</small>
          <b>{Math.round(teamMembers.reduce((sum, member) => sum + member.progress, 0) / Math.max(teamMembers.length, 1))}%</b>
          <em>current average</em>
        </div>
        <div>
          <small>CERTIFIED</small>
          <b>{teamMembers.filter((member) => member.status === "Certified").length}</b>
          <em>team members</em>
        </div>
        <div>
          <small>IN TRAINING</small>
          <b>{teamMembers.filter((member) => member.status === "In progress").length}</b>
          <em>active learners</em>
        </div>
      </section>
      <section className="panel">
        <div className="panelhead">
          <span>
            <h2>Training overview</h2>
            <p>Organization training status · select a member for accomplishments at {activeLocation === "boba-bloom" ? "Boba Bloom" : createdLocations.find((location) => location.id === activeLocation)?.name}</p>
          </span>
        </div>
        {teamMembers.map((member, n) => (
          <button className="member member-button" type="button" key={member.name} onClick={() => setSelectedMember(member)} aria-label={`View ${member.name}'s completed tasks`}>
            <i className={`memberavatar m${n % 4}`}>{member.initials}</i>
            <span>
              <b>{member.name}{member.sample && <span className="sample-tag">Sample</span>}</b>
              <small>{member.role}</small>
            </span>
            <div className="progress">
              <i>
                <em style={{ width: `${member.progress}%` }} />
              </i>
              <small>{member.completed} complete</small>
            </div>
            <b>{member.progress}%</b>
            <em
              className={
                member.status === "Certified"
                  ? "status"
                  : "status progressstatus"
              }
            >
              {member.status}
            </em>
          </button>
        ))}
        {teamMembers.length === 0 && <p className="goals-empty">No team members yet. Add a real employee to begin tracking training.</p>}
      </section>
    </main>
  );

  // The checklist a worker ticks and the opening/closing playbook they can
  // open are the same routine, so read them from the same place: the
  // location's own published playbook when it exists, its starter otherwise.
  const routineFor = (kind: "opening" | "closing") => {
    const match = playbookRecords.find((record) =>
      record.locationId === activeLocation
      && (record.draft.kind === kind || new RegExp(kind, "i").test(record.draft.title))
      && record.draft.steps.length > 0);
    if (match) return match.draft.steps;
    return kind === "opening" ? openingStepsFor(activeCuisine) : closingStepsFor(activeCuisine);
  };
  const checklistItems = routineFor("opening");
  const closingChecklistItems = routineFor("closing");
  const activeChecklistItems = activeChecklist === "opening" ? checklistItems : closingChecklistItems;
  const activeChecks = activeChecklist === "opening" ? shiftChecks : closingChecks;
  const setActiveChecks = (update: (checks: number[]) => number[]) => setChecklistProgress((progress) => ({
    ...progress,
    [activeLocation]: {
      ...(progress[activeLocation] || { opening: [], closing: [] }),
      [activeChecklist]: update(progress[activeLocation]?.[activeChecklist] || []),
    },
  }));
  const checklistTitle = `${activeChecklist === "opening" ? "Opening" : "Closing"} checklist`;
  const checklistCompletedToday = completionRecords.some((record) =>
    record.kind === "checklist" &&
    record.locationId === activeLocation &&
    record.playbook === checklistTitle &&
    new Date(record.completedAt).toDateString() === new Date().toDateString(),
  );
  const completeChecklist = () => {
    if (activeChecks.length !== activeChecklistItems.length || checklistCompletedToday) return;
    const record: CompletionRecord = {
      playbook: checklistTitle,
      locationId: activeLocation,
      kind: "checklist",
      completedAt: new Date().toISOString(),
      worker: identity?.displayName || "Maya Tran",
    };
    const nextRecords = [record, ...completionRecords].slice(0, 50);
    setCompletionRecords(nextRecords);
    void persistSharedState(generatedDraft, draftStatus, nextRecords);
  };
  const checklists = (
    <main className="main collection">
      <header>
        <div>
          <h1>Shift checklists</h1>
          <p>Make every open, close, and clean accountable.</p>
        </div>
      </header>
      <div className="checkgrid">
        <div className="check-tabs" role="tablist" aria-label="Shift checklist type">
          <button className={activeChecklist === "opening" ? "active" : ""} onClick={() => setActiveChecklist("opening")} role="tab" aria-selected={activeChecklist === "opening"}>Opening <span>{shiftChecks.length}/{checklistItems.length}</span></button>
          <button className={activeChecklist === "closing" ? "active" : ""} onClick={() => setActiveChecklist("closing")} role="tab" aria-selected={activeChecklist === "closing"}>Closing <span>{closingChecks.length}/{closingChecklistItems.length}</span></button>
        </div>
        <section className={`checkcard check-${activeChecklist}`}>
          <div className="checkhero">
            <span>
              <small>{activeChecklist.toLocaleUpperCase()} · ALL STATIONS</small>
              <h2>{activeChecklist === "opening" ? "Opening checklist" : "Closing checklist"}</h2>
              <p>{activeLocation === "boba-bloom" ? "Boba Bloom" : createdLocations.find((location) => location.id === activeLocation)?.name}</p>
            </span>
            <b>
              {activeChecks.length}/{activeChecklistItems.length}
            </b>
          </div>
          <div className="check-actions">
            <small>Progress is saved for this location.</small>
            <button type="button" className="secondary" onClick={resetActiveChecklist} disabled={activeChecks.length === 0}>Reset for new shift</button>
          </div>
          <div className="completion">
            <i>
              <em
                style={{
                  width: `${(activeChecks.length / activeChecklistItems.length) * 100}%`,
                }}
              />
            </i>
            <span>
              {Math.round((activeChecks.length / activeChecklistItems.length) * 100)}%
              complete
            </span>
          </div>
          {activeChecklistItems.map((x, n) => (
            <label
              className={activeChecks.includes(n) ? "donecheck" : ""}
              key={x}
            >
              <input
                type="checkbox"
                checked={activeChecks.includes(n)}
                onChange={() =>
                  setActiveChecks((v) =>
                    v.includes(n) ? v.filter((i) => i !== n) : [...v, n],
                  )
                }
              />
              <span>
                <b>{x}</b>
                <small>
                  {n === 1
                    ? activeChecklist === "opening" ? "Record the temperature in the shift log" : "Record every discard in the waste log"
                    : n === 3
                      ? activeChecklist === "opening" ? "Cook 30 minutes, then rest 30 minutes — see the Tapioca Pearl Batch playbook" : "Use the approved sanitizer concentration and contact time"
                      : "Tap when complete"}
                </small>
              </span>
              {activeChecks.includes(n) && <em>Done</em>}
            </label>
          ))}
          <button className="primary complete-checklist" type="button" disabled={activeChecks.length !== activeChecklistItems.length || checklistCompletedToday} onClick={completeChecklist}>
            <Icon name="check" /> {checklistCompletedToday ? "Completed today" : `Complete ${activeChecklist} checklist`}
          </button>
        </section>
      </div>
    </main>
  );

  const scaleMeasuredText = (text: string) => scaleMeasurements(text, servings);
  const stepTimers = useMemo(
    () => alignTimersToSteps(generatedDraft?.timers || [], generatedDraft?.steps || []),
    [generatedDraft?.timers, generatedDraft?.steps],
  );
  const stepEvidence = useMemo(
    () => alignEvidenceToSteps(generatedDraft?.evidence || [], generatedDraft?.steps || []),
    [generatedDraft?.evidence, generatedDraft?.steps],
  );
  const generatedRecipe = generatedDraft && draftStatus === "published" ? (
    <main className={`main detail playbook-${currentPlaybookKind}`}>
      {!initialWorkerLink && <button className="back" onClick={() => setPage("home")}>← All playbooks</button>}
      <header>
        <div>
          <small className="eyebrow">{currentPlaybookKind.toLocaleUpperCase()} · {generatedDraft.station.toLocaleUpperCase()} · PUBLISHED</small>
          <h1>{generatedDraft.title}</h1>
          <p>Follow each approved step and complete the shift record.</p>
        </div>
        {!initialWorkerLink && (
          <span className="actions">
            <button className="secondary" onClick={() => {
              if (activeRecordId && generatedDraft) void publishWorkerSnapshot(activeRecordId, generatedDraft, activePlaybookRecord?.version || 1);
              setQrOpen(true);
            }}><Icon name="qr" /> {activePlaybookRecord?.shareUrl ? "Workstation QR" : "Create workstation QR"}</button>
            <button className="primary" onClick={() => setReviewOpen(true)}>Edit playbook</button>
          </span>
        )}
      </header>
      <div className="recipegrid generated-recipe-grid">
        <section className="recipe">
          <div className="generated-recipe-hero">
            <Icon name="spark" size={28} />
            <span><b>{currentPlaybookKind === "opening" ? "Opening readiness checklist" : currentPlaybookKind === "closing" ? "Closing accountability checklist" : currentPlaybookKind === "cleaning" ? "Cleaning and sanitation checklist" : currentPlaybookKind === "batch" ? "Approved batch procedure" : currentPlaybookKind === "task" ? "Assigned task procedure" : "Approved recipe procedure"}</b><small>{generatedDraft.steps.length} {currentPlaybookKind === "opening" || currentPlaybookKind === "closing" || currentPlaybookKind === "cleaning" ? "checks" : "steps"} · {generatedDraft.assignee || "Assigned team member"} · {generatedDraft.frequency || "As scheduled"}</small></span>
          </div>
          {(currentPlaybookKind === "recipe" || currentPlaybookKind === "batch") && (
            <div className="toolbar">
              <span>
                <small>PORTION</small>
                <div>
                  <button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Decrease portions"><Icon name="minus" size={14} /></button>
                  <b>{servings} {servings === 1 ? (currentPlaybookKind === "batch" ? "batch" : "portion") : currentPlaybookKind === "batch" ? "batches" : "portions"}</b>
                  <button onClick={() => setServings(Math.min(8, servings + 1))} aria-label="Increase portions"><Icon name="plus" size={14} /></button>
                </div>
              </span>
            </div>
          )}
          <div className="steps generated-steps">
            {generatedDraft.steps.map((step, index) => (
              <article key={`${index}-${step}`} className={generatedDone.includes(index) ? "step-complete" : ""}>
                <i>{generatedDone.includes(index) ? "✓" : index + 1}</i>
                <span>
                  <h3>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? scaleMeasuredText(step) : step}</h3>
                  {stepTimers.perStep[index] && <p><Icon name="clock" size={14} /> {stepTimers.perStep[index]}</p>}
                  {stepEvidence[index] && <p className="source-evidence"><Icon name="play" size={13} /> {stepEvidence[index]}</p>}
                  {generatedDraft.confidence?.[index] && <small className={`confidence confidence-${generatedDraft.confidence[index].toLocaleLowerCase()}`}>{generatedDraft.confidence[index]} confidence</small>}
                </span>
                <label className="step-check">
                  <input
                    type="checkbox"
                    checked={generatedDone.includes(index)}
                    onChange={() => setGeneratedDone((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])}
                    aria-label={`Complete step ${index + 1}`}
                  />
                </label>
              </article>
            ))}
          </div>
        </section>
        <aside className="detailside">
          <section>
            <div><h3>Progress</h3><small>{generatedDone.length}/{generatedDraft.steps.length}</small></div>
            <div className="worker-progress"><i style={{ width: `${generatedDraft.steps.length ? (generatedDone.length / generatedDraft.steps.length) * 100 : 0}%` }} /></div>
            <button className="primary complete-run" disabled={generatedDone.length < generatedDraft.steps.length || completionSaved} onClick={completeGeneratedPlaybook}>
              {completionSaved ? "Completion recorded" : "Complete playbook"}
            </button>
          </section>
          <section><h3>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Tools & ingredients" : "Required supplies & equipment"}</h3>{generatedDraft.ingredients.map((item) => <div className="ingredient" key={item}><i /><span>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? scaleMeasuredText(item) : item}</span></div>)}</section>
          {stepTimers.unmatched.length > 0 && <section><h3>Timers</h3>{stepTimers.unmatched.map((item) => <p className="safety-line" key={item}><Icon name="clock" size={13} /> {item}</p>)}</section>}
          <section><h3>Safety checks</h3>{generatedDraft.safetyChecks.map((item) => <p className="safety-line" key={item}>✓ {item}</p>)}</section>
          {generatedDraft.qualityCues.length > 0 && <section className="tip"><Icon name="spark" /><span><b>Quality checkpoint</b><p>{generatedDraft.qualityCues.join(" · ")}</p></span></section>}
        </aside>
      </div>
    </main>
  ) : null;

  const recipe = (
    <main className="main detail">
      <button className="back" onClick={() => setPage("home")}>
        ← All playbooks
      </button>
      <header>
        <div>
          <small className="eyebrow">BAR STATION · PUBLISHED</small>
          <h1>Brown Sugar Milk Tea</h1>
          <p>A consistent, creamy house favorite with brown sugar ribbons.</p>
        </div>
        <span className="actions">
          <button className="secondary" onClick={() => setQrOpen(true)}>
            <Icon name="qr" /> Workstation QR
          </button>
        </span>
      </header>
      <div className="recipegrid">
        <section className="recipe">
          <div className="video">
            <div className="bigcup">
              <i />
              <b />
            </div>
            <div className="hand" />
            <span>00:42 / 03:48</span>
          </div>
          <div className="toolbar">
            <span>
              <small>PORTION</small>
              <div>
                <button onClick={() => setServings(Math.max(1, servings - 1))}>
                  <Icon name="minus" size={14} />
                </button>
                <b>
                  {servings} {servings === 1 ? "drink" : "drinks"}
                </b>
                <button onClick={() => setServings(Math.min(8, servings + 1))}>
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </span>
            <label>
              <Icon name="globe" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as keyof typeof copy)}
              >
                <option>English</option>
                <option>Español</option>
                <option>中文</option>
              </select>
            </label>
          </div>
          <div className="steps">
            {copy[lang].map((title, n) => (
              <article key={title}>
                <i>{n + 1}</i>
                <span>
                  <h3>{title}</h3>
                  <p>
                    {n === 0
                      ? `Add ${qty.pearls} g cooked brown-sugar tapioca pearls to ${servings === 1 ? "a clean 500 ml serving cup" : `${servings} clean 500 ml serving cups`}. Add ${qty.syrup} ml brown-sugar syrup and rotate each cup to form visible ribbons.`
                      : n === 1
                        ? `In a sanitized shaker, combine ${qty.tea} ml chilled black tea with ${qty.milk} ml cold whole milk. Both ingredients must be at 41°F (5°C) or below.`
                        : n === 2
                          ? `Add ${qty.ice} g ice, seal the shaker, and shake vigorously for 10 seconds.`
                          : n === 3
                            ? `Strain the milk tea into ${servings === 1 ? "the prepared serving cup" : "the prepared serving cups"}, keeping the pearls at the bottom and the syrup ribbons visible.`
                            : "Seal the cup, wipe the exterior, mark any dairy substitution, add a wide straw, and serve immediately."}
                  </p>
                  {n === 2 && (
                    <div className="timer">
                      <Icon name="clock" />
                      <b>0:{String(timer).padStart(2, "0")}</b>
                      <span>Shake timer</span>
                      <button
                        onClick={() => {
                          if (timer === 0) setTimer(10);
                          setRunning(!running);
                        }}
                      >
                        {timer === 0 ? "Reset" : running ? "Pause" : "Start"}
                      </button>
                    </div>
                  )}
                </span>
                <button type="button" className={defaultStepDone.includes(n) ? "step-complete done" : "step-complete"} onClick={() => setDefaultStepDone((items) => items.includes(n) ? items.filter((item) => item !== n) : [...items, n])} aria-label={`${defaultStepDone.includes(n) ? "Mark incomplete" : "Mark complete"}: ${title}`}>
                  <Icon name="check" size={15} />
                </button>
              </article>
            ))}
          </div>
        </section>
        <aside className="detailside">
          <section>
            <div>
              <h3>Before you start</h3>
              <small>{done.length}/3</small>
            </div>
            {[
              "Wash hands and wear gloves",
              "Confirm milk and tea are at or below 41°F",
              "Sanitize shaker, scoop, and counter",
            ].map((x, n) => (
              <label key={x}>
                <input
                  type="checkbox"
                  checked={done.includes(n)}
                  onChange={() =>
                    setDone((v) =>
                      v.includes(n) ? v.filter((i) => i !== n) : [...v, n],
                    )
                  }
                />
                {x}
              </label>
            ))}
          </section>
          <section>
            <h3>Tools & ingredients</h3>
            {[
              ["Cooked brown-sugar pearls", `${qty.pearls} g`],
              ["Brown sugar syrup", `${qty.syrup} ml`],
              ["Chilled black tea", `${qty.tea} ml`],
              ["Whole milk", `${qty.milk} ml`],
              ["Ice", `${qty.ice} g`],
              ["500 ml cup + shaker", `${servings} + 1`],
            ].map((x) => (
              <div className="ingredient" key={x[0]}>
                <i />
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </section>
          <section className="tip">
            <Icon name="spark" />
            <span>
              <b>Quality checkpoint</b>
              <p>
                Brown sugar should create visible ribbons—not pool at the
                bottom.
              </p>
            </span>
          </section>
          <section className="meta">
            <span>Verification</span>
            <b>Not verified for this location</b>
            <span>Process owner</span>
            <b>{identity?.displayName || "Unassigned"}</b>
          </section>
          <button className="primary complete-run" type="button" disabled={defaultStepDone.length < copy.English.length || done.length < 3 || defaultCompletionSaved} onClick={completeDefaultPlaybook}>
            <Icon name="check" /> {defaultCompletionSaved ? "Run recorded" : "Complete playbook"}
          </button>
        </aside>
      </div>
    </main>
  );

  const goalsPage = (
    <main className="main collection">
      <header><div><h1>Location goals</h1><p>Set measurable operating goals for the active location.</p></div></header>
      <section className="panel goals-panel">
        <form className="goal-form" onSubmit={(event) => {
          event.preventDefault();
          const title = goalInput.trim();
          if (!title) return;
          setGoals((items) => [...items, { id: crypto.randomUUID(), title, done: false, location: activeLocation }]);
          setGoalInput("");
        }}>
          <input value={goalInput} onChange={(event) => setGoalInput(event.target.value)} placeholder="Example: Train every opener by Friday" aria-label="New goal" />
          <button className="primary" type="submit">Add goal</button>
        </form>
        {goals.filter((goal) => (goal.location || "boba-bloom") === activeLocation).map((goal) => (
          <label className={`goal-row ${goal.done ? "goal-done" : ""}`} key={goal.id}>
            <input type="checkbox" checked={goal.done} onChange={() => setGoals((items) => items.map((item) => item.id === goal.id ? { ...item, done: !item.done } : item))} />
            <span>{goal.title}</span>
            <button type="button" onClick={() => setGoals((items) => items.filter((item) => item.id !== goal.id))} aria-label={`Delete ${goal.title}`}><Icon name="close" size={15} /></button>
          </label>
        ))}
        {goals.filter((goal) => (goal.location || "boba-bloom") === activeLocation).length === 0 && <p className="goals-empty">No goals yet for this location. Add the first measurable outcome above.</p>}
      </section>
    </main>
  );

  const settingsPage = (
    <main className="main collection settings-page">
      <header><div><h1>Settings</h1><p>Manage restaurant locations and workspace access.</p></div></header>
      <section className="panel settings-section">
        <div className="settings-heading">
          <span><h2>Locations</h2><p>Each location has its own playbooks, tasks, team activity, and goals.</p></span>
          <button className="primary" type="button" onClick={() => setLocationModalOpen(true)}><Icon name="plus" /> Add location</button>
        </div>
        <button type="button" className={`settings-location ${activeLocation === "boba-bloom" ? "active" : ""}`} onClick={() => setActiveLocation("boba-bloom")}>
          <i>B</i><span><b>Boba Bloom</b><small>Main location · 4 starter playbooks</small></span><em>{activeLocation === "boba-bloom" ? "Active" : "Switch"}</em>
        </button>
        {createdLocations.map((location) => (
          <button type="button" className={`settings-location ${activeLocation === location.id ? "active" : ""}`} onClick={() => setActiveLocation(location.id)} key={location.id}>
            <i>{location.cuisine[0]}</i><span><b>{location.name}</b><small>{location.cuisine} · {location.playbooks.length} playbooks</small></span><em>{activeLocation === location.id ? "Active" : "Switch"}</em>
          </button>
        ))}
      </section>
      <section className="panel settings-section settings-access">
        <h2>Pipeline cost and latency</h2>
        <p>Measured RocketRide runs for this workspace. Cost is an estimate from run time so you can keep demo spend bounded; provider invoices may differ.</p>
        {runMetrics.length === 0 ? (
          <p className="goals-empty">No pipeline runs recorded yet. Process one video or instruction image to capture latency here.</p>
        ) : (
          <div className="metrics-panel">
            <div className="metrics-summary">
              <span><small>AVG LATENCY</small><b>{Math.round(runMetrics.reduce((sum, metric) => sum + metric.durationMs, 0) / runMetrics.length / 1000)}s</b></span>
              <span><small>SUCCESS RATE</small><b>{Math.round((runMetrics.filter((metric) => metric.status === "success").length / runMetrics.length) * 100)}%</b></span>
              <span><small>EST. SPEND</small><b>${runMetrics.reduce((sum, metric) => sum + (metric.source === "video" ? 0.06 + metric.durationMs / 180000 * 0.08 : 0.02 + metric.durationMs / 60000 * 0.03), 0).toFixed(2)}</b></span>
            </div>
            {runMetrics.slice(0, 6).map((metric) => (
              <div className="metrics-row" key={`${metric.completedAt}-${metric.source}`}>
                <b>{metric.source === "video" ? "Process video" : "Written instructions"}</b>
                <small>{metric.status === "success" ? "Succeeded" : "Failed"} · {Math.round(metric.durationMs / 1000)}s · {new Date(metric.completedAt).toLocaleString()}</small>
                <em>${(metric.source === "video" ? 0.06 + metric.durationMs / 180000 * 0.08 : 0.02 + metric.durationMs / 60000 * 0.03).toFixed(2)}</em>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel settings-section settings-access">
        <h2>User access</h2>
        <p>Team members listed inside Playbook are operational records. Give app access through your RocketRide team or a workstation QR for a published playbook.</p>
      </section>
    </main>
  );

  const workerLinkState = initialWorkerLink && initialPlaybookSlug && initialPlaybookSlug !== "brown-sugar-milk-tea" && (!workerShareLoaded || workerLoadError) ? (
    <main className="main worker-link-state">
      <section className="panel">
        <Icon name={workerLoadError ? "close" : "spark"} size={28} />
        <h1>{workerLoadError ? "Playbook unavailable" : "Loading playbook…"}</h1>
        <p>{workerLoadError || "Fetching the exact published procedure from RocketRide."}</p>
        {workerLoadError && <button className="primary" onClick={() => window.location.reload()}>Try again</button>}
      </section>
    </main>
  ) : null;
  const missingGeneratedPlaybook = (
    <main className="main worker-link-state">
      <section className="panel">
        <Icon name="close" size={28} />
        <h1>Playbook unavailable</h1>
        <p>This link does not match a published playbook, so Playbook will not open a different recipe.</p>
        {!initialWorkerLink && <button className="primary" onClick={() => setPage("home")}>Back to playbooks</button>}
      </section>
    </main>
  );

  const content =
    page === "recipe"
      ? workerLinkState || generatedRecipe || (selectedRecipe === "default" ? recipe : missingGeneratedPlaybook)
      : section === "Playbooks"
        ? playbooks
        : section === "Team"
          ? team
          : section === "Tasks"
            ? checklists
            : section === "Goals"
              ? goalsPage
            : section === "Settings"
              ? settingsPage
            : home;
  return (
    <AppLayout sidebar={initialWorkerLink ? undefined : sidebar}>
      {content}
      {modal && (
        <div className="overlay">
          <section className="modal create-modal" role="dialog" aria-modal="true" aria-labelledby="create-playbook-title">
            <button onClick={() => setModal(false)} aria-label="Close create playbook">
              <Icon name="close" />
            </button>
            <i>
              <Icon name="spark" size={24} />
            </i>
            <small className="eyebrow">AI PLAYBOOK BUILDER</small>
            <h2 id="create-playbook-title">Choose a playbook type.</h2>
            <p>Start with the right basic structure. Then create the draft now or use a photo/video to fill it with source details.</p>
            <div className="playbook-type-grid">
              {(["recipe", "batch", "opening", "closing", "cleaning", "task"] as const).map((kind) => <button type="button" className={createKind === kind ? "active" : ""} onClick={() => setCreateKind(kind)} key={kind}><b>{kind === "batch" ? "Batch prep" : kind[0].toLocaleUpperCase() + kind.slice(1)}</b><small>{kind === "recipe" ? "Ingredients and serving steps" : kind === "batch" ? "Measured production run" : kind === "opening" ? "Ready the location" : kind === "closing" ? "Secure the location" : kind === "cleaning" ? "Wash, rinse, sanitize" : "Assigned operating work"}</small></button>)}
            </div>
            <button className="primary basic-template-action" type="button" onClick={startBasicPlaybook}>Use basic {createKind} template</button>
            <div className="template-divider"><span>or fill this {createKind} template from a source</span></div>
            <div className="source-upload-grid">
              <label className="upload">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void create(file);
                  }}
                />
                <i><Icon name="upload" size={24} /></i>
                <b>Fill from process video</b>
                <span>MP4, MOV, or WEBM · 250 MB max</span>
                <em>Choose video</em>
              </label>
              <label className="upload instruction-upload">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void createFromInstructionImage(file);
                  }}
                />
                <i><Icon name="book" size={24} /></i>
                <b>Fill from photo</b>
                <span>JPG, PNG, or WEBP · 15 MB max</span>
                <em>Choose image</em>
              </label>
            </div>
            <small className="powered">
              <Icon name="spark" size={13} /> Powered by a RocketRide multimodal
              pipeline
            </small>
          </section>
        </div>
      )}
      {locationModalOpen && (
        <div className="overlay">
          <section className="modal create-modal location-modal" role="dialog" aria-modal="true" aria-labelledby="create-location-title">
            <button onClick={() => setLocationModalOpen(false)} aria-label="Close create location"><Icon name="close" /></button>
            <i><Icon name="grid" size={24} /></i>
            <small className="eyebrow">NEW LOCATION WORKSPACE</small>
            <h2 id="create-location-title">Launch a complete location.</h2>
            <p>Choose a cuisine starter. The new location includes recipe, opening, closing, cleaning, prep, and service playbooks that stay separate from every other location.</p>
            <label className="location-name-field"><span>Location name</span><input autoFocus value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="Example: Boba Bloom Uptown" /></label>
            <label className="template-search"><Icon name="search" size={16} /><input value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Search cuisines and location systems" aria-label="Search location templates" /></label>
            <div className="template-grid">
              {locationStarters.filter((template) => `${template.cuisine} ${template.name} ${template.playbooks.flat().join(" ")}`.toLocaleLowerCase().includes(templateQuery.trim().toLocaleLowerCase())).map((template) => (
                <button type="button" className={`template-card location-template-card ${selectedLocationTemplateId === template.id ? "selected" : ""}`} key={template.id} onClick={() => setSelectedLocationTemplateId(template.id)}>
                  <span>{template.cuisine}</span><b>{template.name}</b>
                  <small>{template.playbooks.length} playbooks · recipe · opening · closing · cleaning · prep</small>
                  <em>{selectedLocationTemplateId === template.id ? "Selected" : "Select template"}</em>
                </button>
              ))}
            </div>
            <button type="button" className="primary create-location-submit" disabled={!newLocationName.trim() || !selectedLocationTemplateId} onClick={() => {
              const starter = locationStarters.find((template) => template.id === selectedLocationTemplateId);
              if (starter) createLocationFromStarter(starter);
            }}><Icon name="plus" /> Create location</button>
          </section>
        </div>
      )}
      {reviewOpen && generatedDraft && (
        <div className="overlay">
          <section className={`modal draft-review review-${currentPlaybookKind}`} role="dialog" aria-modal="true" aria-labelledby="draft-review-title">
            <button onClick={() => setReviewOpen(false)} aria-label="Close review">
              <Icon name="close" />
            </button>
            <i>
              <Icon name="spark" size={24} />
            </i>
            <small className="eyebrow">{currentPlaybookKind.toLocaleUpperCase()} PLAYBOOK · OWNER REVIEW</small>
            <h2 id="draft-review-title">Review the {currentPlaybookKind} standard.</h2>
            <p>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Verify every measurement, timed step, quality cue, and food-safety limit." : "Verify the assignment order, required equipment, due window, sign-off standard, and safety checks."}</p>
            {generatedDraft.warnings.length > 0 && (
              <div className="review-warnings">
                <strong>{generatedDraft.warnings.length} item{generatedDraft.warnings.length === 1 ? "" : "s"} need review</strong>
                <ul>{generatedDraft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                <label className="warning-confirm"><input type="checkbox" checked={warningsAcknowledged} onChange={(event) => setWarningsAcknowledged(event.target.checked)} /> I verified these items against the source or location standard.</label>
              </div>
            )}
            <div className="review-grid">
              <label>
                <span>Playbook title</span>
                <input value={generatedDraft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
              </label>
              <label>
                <span>Station</span>
                <input value={generatedDraft.station} onChange={(event) => updateDraft({ station: event.target.value })} />
              </label>
              <label>
                <span>Playbook type</span>
                <select value={currentPlaybookKind} onChange={(event) => updateDraft({ kind: event.target.value as GeneratedDraft["kind"] })}>
                  <option value="opening">Opening checklist</option>
                  <option value="closing">Closing checklist</option>
                  <option value="cleaning">Cleaning checklist</option>
                  <option value="recipe">Recipe</option>
                  <option value="batch">Batch preparation</option>
                  <option value="task">Task</option>
                </select>
              </label>
              <label>
                <span>Responsible role</span>
                <input value={generatedDraft.assignee || ""} onChange={(event) => updateDraft({ assignee: event.target.value })} placeholder="Opening shift lead" />
              </label>
              <label>
                <span>Frequency</span>
                <input value={generatedDraft.frequency || ""} onChange={(event) => updateDraft({ frequency: event.target.value })} placeholder="Every operating day" />
              </label>
              <label>
                <span>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Ingredients and exact amounts" : "Required supplies and equipment"}</span>
                <textarea value={generatedDraft.ingredients.join("\n")} onChange={(event) => updateDraft({ ingredients: asTypedLines(event.target.value) })} placeholder={currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "30 ml brown sugar syrup" : "Calibrated thermometer"} />
              </label>
              <label>
                <span>{currentPlaybookKind === "opening" || currentPlaybookKind === "closing" || currentPlaybookKind === "cleaning" ? "Checklist items in order" : currentPlaybookKind === "task" ? "Task steps in order" : "Ordered preparation steps"}</span>
                <textarea value={generatedDraft.steps.join("\n")} onChange={(event) => updateDraft({ steps: asTypedLines(event.target.value) })} placeholder={currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Portion 60 g cooked pearls" : "Record refrigeration temperatures"} />
              </label>
              <label>
                <span>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Timers" : "Schedule and due window"}</span>
                <textarea value={generatedDraft.timers.join("\n")} onChange={(event) => updateDraft({ timers: asTypedLines(event.target.value) })} placeholder={currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Shake for 10 seconds" : "Complete before doors open"} />
              </label>
              <label>
                <span>Safety checks</span>
                <textarea value={generatedDraft.safetyChecks.join("\n")} onChange={(event) => updateDraft({ safetyChecks: asTypedLines(event.target.value) })} placeholder="Keep milk at 41°F / 5°C or below" />
              </label>
              <label className="review-wide">
                <span>{currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Quality cues" : "Completion and sign-off standard"}</span>
                <textarea value={generatedDraft.qualityCues.join("\n")} onChange={(event) => updateDraft({ qualityCues: asTypedLines(event.target.value) })} placeholder={currentPlaybookKind === "recipe" || currentPlaybookKind === "batch" ? "Tea is evenly mixed with no syrup streaks" : "Station is stocked, logged, and ready"} />
              </label>
              <label>
                <span>Step evidence (one line per step)</span>
                <textarea value={(generatedDraft.evidence || []).join("\n")} onChange={(event) => updateDraft({ evidence: asTypedLines(event.target.value) })} placeholder="00:42 · Worker adds 60 g pearls" />
              </label>
              <label>
                <span>Confidence (one per step)</span>
                <textarea value={(generatedDraft.confidence || []).join("\n")} onChange={(event) => updateDraft({ confidence: asTypedLines(event.target.value) })} placeholder="high&#10;medium&#10;low" />
              </label>
            </div>
            {reviewError && <p className="review-error" role="alert">{reviewError}</p>}
            <footer className="review-actions">
              {draftStatus === "draft" && activeRecordId && <button className="danger-button" onClick={deleteActiveDraft}>Delete draft</button>}
              <button className="secondary" onClick={() => saveDraft(false)}>Save draft</button>
              <button className="primary" onClick={() => saveDraft(true)}>Approve &amp; publish</button>
            </footer>
          </section>
        </div>
      )}
      {profileOpen && (
        <div className="overlay">
          <section className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="Close owner profile"><Icon name="close" /></button>
            <i className="profile-avatar">MT</i>
            <small className="eyebrow">OWNER PROFILE</small>
            <h2 id="account-modal-title">{identity?.displayName || "Maya Tran"}</h2>
            <p>Workspace owner for {activeLocation === "boba-bloom" ? "Boba Bloom" : createdLocations.find((location) => location.id === activeLocation)?.name}.</p>
            <div className="account-facts">
              <span><small>ROLE</small><b>Owner</b></span>
              <span><small>WORKSPACE</small><b>Playbook operations</b></span>
              <span><small>SYNC</small><b>{cloudStatus === "synced" ? "Cloud synced" : cloudStatus === "syncing" ? "Syncing" : cloudStatus === "error" ? "Sync issue" : "Saved locally"}</b></span>
            </div>
            <button className="secondary modal-close-action" type="button" onClick={() => setProfileOpen(false)}>Close</button>
          </section>
        </div>
      )}
      {selectedMember && (
        <div className="overlay">
          <section className="modal member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
            <button type="button" onClick={() => setSelectedMember(null)} aria-label="Close team member details"><Icon name="close" /></button>
            <i className="profile-avatar">{selectedMember.initials}</i>
            <small className="eyebrow">TEAM ACTIVITY · {activeLocation === "boba-bloom" ? "BOBA BLOOM" : (createdLocations.find((location) => location.id === activeLocation)?.name || "ACTIVE LOCATION").toLocaleUpperCase()}</small>
            <h2 id="member-detail-title">{selectedMember.name}</h2>
            <p>{selectedMember.role} · {selectedMember.status} · {selectedMember.completed} assignments complete{selectedMember.email ? ` · ${selectedMember.email}` : ""}</p>
            <div className="member-accomplishments">
              <h3>Tasks accomplished</h3>
              {[...new Set([
                ...(starterActivityByLocation[activeLocation] || []).filter((activity) => activity.worker === selectedMember.name).map((activity) => activity.task),
                ...completionRecords.filter((record) => record.worker === selectedMember.name && (record.locationId || "boba-bloom") === activeLocation).map((record) => record.playbook),
              ])].map((task) => <div key={task}><Icon name="check" size={15} /><span><b>{task}</b><small>Completed training record</small></span></div>)}
              {(starterActivityByLocation[activeLocation] || []).every((activity) => activity.worker !== selectedMember.name) && completionRecords.every((record) => record.worker !== selectedMember.name || (record.locationId || "boba-bloom") !== activeLocation) && <p>No completed tasks recorded at this location yet.</p>}
            </div>
            <div className="member-detail-actions">
              {selectedMember.status !== "Certified" && <button className="primary" type="button" onClick={certifySelectedMember}>Mark certified</button>}
              {selectedMember.role !== "Owner" && <button className="danger-button" type="button" onClick={removeSelectedMember}>Remove member</button>}
              <button className="secondary" type="button" onClick={() => setSelectedMember(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
      {inviteOpen && (
        <div className="overlay">
          <form className="modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="team-modal-title" onSubmit={inviteTeamMember}>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              aria-label="Close invitation"
            >
              <Icon name="close" />
            </button>
            <i>
              <Icon name="team" size={24} />
            </i>
            <small className="eyebrow">TEAM ROSTER</small>
            <h2 id="team-modal-title">Add a roster member.</h2>
            <p>
              Create an employee training record. This does not send an account invitation; app access is managed through your RocketRide team in Settings.
            </p>
            <label>
              <span>Name</span>
              <input
                required
                autoFocus
                value={inviteName}
                onChange={(event) => { setInviteName(event.target.value); setInviteError(""); }}
                placeholder="Jordan Lee"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(event) => { setInviteEmail(event.target.value); setInviteError(""); }}
                placeholder="jordan@bobabloom.com"
              />
            </label>
            <label>
              <span>Role</span>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              >
                <option>Barista</option>
                <option>Shift lead</option>
                <option>New hire</option>
                <option>Manager</option>
              </select>
            </label>
            {inviteError && <p className="review-error" role="alert">{inviteError}</p>}
            <button className="primary invite-submit" type="submit">
              Add to roster
            </button>
          </form>
        </div>
      )}
      {qrOpen && (
        <div className="overlay">
          <section className="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
            <button onClick={() => setQrOpen(false)} aria-label="Close QR code">
              <Icon name="close" />
            </button>
            <i>
              <Icon name="qr" size={24} />
            </i>
            <small className="eyebrow">WORKSTATION ACCESS</small>
            <h2 id="qr-modal-title">{selectedRecipe === "generated" && generatedDraft ? generatedDraft.title : "Brown Sugar Milk Tea"}</h2>
            <p>
              Print and place this code at the station. Scanning it opens this exact published playbook on a second device.
            </p>
            {qrDataUrl ? (
              <img
                className="qr-image"
                src={qrDataUrl}
                alt={`QR code for ${selectedRecipe === "generated" && generatedDraft ? generatedDraft.title : "Brown Sugar Milk Tea"} worker recipe`}
              />
            ) : (
              <div className="qr-loading">Generating secure QR…</div>
            )}
            {qrLinkUrl && (
              <label className="qr-link">
                <span>Or send this link — the playbook travels inside it</span>
                <input
                  ref={qrLinkRef}
                  readOnly
                  value={qrLinkUrl}
                  aria-label="Workstation link"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            )}
            <div className="qr-actions">
              <button
                className="secondary"
                disabled={!qrLinkUrl}
                onClick={() => {
                  if (!qrLinkUrl) return;
                  // Always select the field first: clipboard access is refused
                  // in plenty of contexts, and a button that silently does
                  // nothing is worse than one that hands you the text.
                  qrLinkRef.current?.focus();
                  qrLinkRef.current?.select();
                  void Promise.resolve(navigator.clipboard?.writeText(qrLinkUrl))
                    .then(() => setQrCopied(true))
                    .catch(() => setQrCopied(false));
                }}
              >
                {qrCopied ? "Link copied" : "Copy link"}
              </button>
              <button className="primary qr-print" onClick={() => window.print()}>
                Print workstation card
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
};
export default App;
