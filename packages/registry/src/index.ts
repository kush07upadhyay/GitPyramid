export { checkLicense, compareWithGitHub, normalizeLicenseId } from "./license";
export { loadRegistry } from "./loader";
export { checkOnline } from "./online";
export { brickPath, parseBrickPath } from "./paths";
export {
  type Brick,
  BrickSchema,
  type LedgerEntry,
  LedgerEntrySchema,
  SECTORS,
  type Sector,
  type Taxonomy,
  TaxonomySchema,
  TIERS,
  type Tier,
} from "./schema";
export { loadTaxonomy } from "./taxonomy";
export type { Issue, ValidationResult } from "./types";
export { validateRegistry } from "./validate";
