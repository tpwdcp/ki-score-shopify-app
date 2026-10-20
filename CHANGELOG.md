# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- App home connects the shop with a KIscore website by its connection key; KIscore then reads the shop's ShopifyQL session statistics (AI channels, bots).
- The web pixel and app proxy of the first draft are gone: Shopify's own statistics cover the AI channels without code in the store and need only `read_reports`.
