# TSNX 2.0.0-rc.2

This release candidate includes the TSNX 2.0 changes described in
[`RELEASE_NOTES_2.0.0-rc.1.md`](./RELEASE_NOTES_2.0.0-rc.1.md), plus the
following updates:

- `isoDate()` now exposes the named public `IsoDateDescriptor` return type.
- `integer()` now exposes the named public `IntegerDescriptor` return type.
- Applications can emit declaration files for exported schemas that use these
  descriptors without TypeScript TS4023 (`cannot be named`) errors.
- The docs site has a version switcher for v2.0 RC and v1.3.2 stable, and a
  dedicated Standard Schema binding guide.

The `isoDate()` and `integer()` runtime behavior is unchanged in this release.
