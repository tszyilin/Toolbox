export type IconKey = "home" | "grid" | "trend" | "slope" | "thermometer" | "droplet" | "cloud-rain";

export interface ToolLink {
  name: string;
  href: string;
  icon: IconKey;
  description?: string;
  external?: boolean;
}

export interface Category {
  name: string;
  slug: string;
  icon: IconKey;
  tools: ToolLink[];
}

export const CATEGORIES: Category[] = [
  {
    name: "General",
    slug: "general",
    icon: "trend",
    tools: [
      {
        name: "Interpolation / Extrapolation",
        href: "/tools/interpolation",
        icon: "trend",
        description: "Paste or upload X,Y data and query any value — live linear interpolation and extrapolation.",
      },
    ],
  },
  {
    name: "Hydrology",
    slug: "hydrology",
    icon: "slope",
    tools: [
      {
        name: "Equal Area Slope",
        href: "/tools/equal-area-slope",
        icon: "slope",
        description: "Calculate equal area slope from surveyed cross-section data.",
      },
      {
        name: "PMP Estimation",
        href: "/tools/pmp",
        icon: "cloud-rain",
        description: "Estimate Probable Maximum Precipitation by catchment using the GSDM, GTSMR and GSAM methods.",
      },
    ],
  },
  {
    name: "External Resource",
    slug: "external-resource",
    icon: "cloud-rain",
    tools: [
      {
        name: "BOM Rainfall Data Extractor",
        href: "https://bomextract.up.railway.app/",
        icon: "cloud-rain",
        description: "Extract and download rainfall data from the Bureau of Meteorology.",
        external: true,
      },
    ],
  },
];

export function ToolIcon({ icon }: { icon: IconKey }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none" as const };
  switch (icon) {
    case "home":
      return (
        <svg {...common}>
          <path d="M2.5 7.5L8 2.5l5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6.5V13a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 13.5V10a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="2" y="2" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9.5" y="2" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
          <rect x="2" y="9.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="M2 12l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.5 5H14v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "slope":
      return (
        <svg {...common}>
          <path d="M2 13h12M2 13L9 4l5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "thermometer":
      return (
        <svg {...common}>
          <path d="M8 2.5a1.5 1.5 0 00-1.5 1.5v5.1a2.5 2.5 0 101.5-.1V4a1.5 1.5 0 00-1.5-1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "droplet":
      return (
        <svg {...common}>
          <path d="M8 2.5S3.5 7.2 3.5 10a4.5 4.5 0 009 0C12.5 7.2 8 2.5 8 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cloud-rain":
      return (
        <svg {...common}>
          <path d="M4.5 8.5a2.7 2.7 0 01.3-5.4 3.4 3.4 0 016.4-1 3 3 0 013.3 3 2.5 2.5 0 01-.3 4.9H4.8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 11v1.5M8 11v2M10.5 11v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
  }
}
