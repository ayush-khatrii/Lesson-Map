-- Additive only: existing resources and enum values remain unchanged.
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'Document';
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'Spreadsheet';
