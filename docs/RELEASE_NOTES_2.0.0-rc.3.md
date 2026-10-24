# TSNX 2.0.0-rc.3

This release candidate improves generated OpenAPI schemas for discriminated unions.
Each `oneOf` object variant now has a `title` derived from its discriminator field
and value, such as `mode: flat` or `enabled: false`. Scalar can use these titles
to display meaningful names for top-level and nested variants.

No runtime request parsing or validation behavior changed.
