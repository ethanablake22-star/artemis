# Artemis v0.0.11: Data Backup Export and Verification

## What changed
- **Export backup** on Home writes a portable `.artemis-backup.json` archive to a location selected by the user.
- **Verify file** opens a previously exported archive and validates its manifest, JSON store shapes, and per-store SHA-256 checksums.
- Electron Main owns the filesystem operations. Renderer code can only invoke `backup.export()` and `backup.verify()`.
- No destructive restore or import is exposed.

## Included data
Only existing Artemis-managed JSON files under Electron `app.getPath('userData')` are exported:
- `artemis_library_store.json`
- `artemis_documents_store.json`
- `artemis_automotive_store.json`
- `artemis_schedule_store.json`
- `artemis_home_store.json`

Missing stores are skipped. Invalid existing stores fail the export instead of being silently excluded. The export does not include external assets, operating system files, other application data, nor anything added after the archive snapshot was captured.

## Important limits
- **Not encrypted:** contents can include customer contact details, notes, invoices and payments. Store archives privately.
- **Not a point-in-time transaction:** stores are read one by one. Do not modify records while exporting. Finish editing open documents first.
- **Not an automatic backup:** users must export manually. An unverified archive is not a substitute for a practiced restore procedure.
- **Verification is integrity checking, not restoration:** it cannot prove an archive contains every desired data record or is compatible with future Artemis releases.
- **Restore is not implemented:** do not replace live stores with archive contents manually without a tested migration/restore process.
- Archives currently cap at 250 MiB.

## Development verification
```bash
npm ci
npm run typecheck
npm run build
npm run dev
```
In Electron, open Home, click **Export backup**, save a file and use **Verify file** to confirm it. Make a copy and edit one character within a backed-up store's `content` string. **Verify file** must reject the altered archive. Test empty profiles, canceled dialogs, stale documents with unsaved edits and files that exceed the size limit.

## Next iteration
1. Add coordinated store flush and snapshot consistency.
2. Add encrypted exports.
3. Add a transactional, rollback-safe restore flow with migration validation and dry-run preview.
4. Add automated tests for archives and backups of realistic data.
