// Constants for SODAX Brand Bible MCP Server

export const BRAND_BIBLE_URL = "https://iconfoundation.notion.site/brand-bible-v1";

export const CHARACTER_LIMIT = 25000;

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Brand Bible section structure
export const BRAND_SECTIONS = {
  ESSENCE: "1",
  POSITIONING: "2", 
  VERBAL: "3",
  VISUAL: "4",
  CHANNELS: "5",
  PARTNERSHIPS: "6"
} as const;

export const SECTION_NAMES: Record<string, string> = {
  "1": "Brand Essence and Foundations",
  "2": "Positioning and Messaging Architecture", 
  "3": "Verbal Identity",
  "4": "Visual Identity",
  "5": "Brand Expression Across Channels",
  "6": "Brand Use in Partnerships and Integrations"
};

export const SUBSECTION_NAMES: Record<string, string> = {
  // Section 1: Brand Essence
  "1.1": "Brand Overview",
  "1.2": "Brand Purpose",
  "1.3": "Brand Promise",
  "1.4": "Brand Values",
  "1.5": "Brand Personality",
  "1.6": "Core Brand Idea",
  
  // Section 2: Positioning
  "2.1": "Market Context",
  "2.2": "Category Definition",
  "2.3": "Problem Statement",
  "2.4": "SODAX Positioning Statement",
  "2.5": "Audience Segmentation",
  "2.6": "Messaging Pillars",
  "2.7": "Value Propositions by Audience",
  "2.8": "Competitive Differentiation",
  "2.9": "Proof Points",
  "2.10": "Positioning Guardrails",
  
  // Section 3: Verbal Identity
  "3.1": "Tone of Voice",
  "3.2": "Writing Principles",
  "3.3": "How We Talk to B2B Builders",
  "3.4": "How We Talk to B2C Users",
  "3.5": "Messaging Do's and Don'ts",
  "3.6": "Example Message Patterns",
  
  // Section 4: Visual Identity
  "4.1": "Logo Usage",
  "4.2": "Selected Color Palette",
  "4.3": "Typography",
  "4.4": "Iconography",
  "4.5": "Layout and Composition",
  "4.6": "Motion and Animation",
  "4.7": "Accessibility Standards",
  
  // Section 5: Channels
  "5.1": "Shared Principles (All Channels)",
  "5.2": "X",
  "5.3": "Reddit",
  "5.4": "YouTube",
  "5.5": "Consistency Rule",
  
  // Section 6: Partnerships
  "6.1": "Core Principle",
  "6.2": "Partner Announcements",
  "6.3": "Visual Presence in Partner Contexts",
  "6.4": "Case Studies (External)",
  "6.5": "Developer-facing Contexts"
};
