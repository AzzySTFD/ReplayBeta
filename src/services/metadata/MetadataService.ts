import type { MetadataProvider } from "./providers";

/**
 * Registry and future orchestration boundary for normalized metadata providers.
 *
 * This initial implementation manages provider registration only. Cross-source
 * search, entity matching, enrichment, caching, and precedence policies will
 * be introduced here without exposing provider details to application code.
 */
export class MetadataService {
  private readonly providers = new Map<string, MetadataProvider>();

  constructor(initialProviders: MetadataProvider[] = []) {
    initialProviders.forEach((provider) => this.registerProvider(provider));
  }

  /** Register or replace a provider using its stable provider key. */
  registerProvider(provider: MetadataProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Return a registered provider, if available. */
  getProvider(providerId: string): MetadataProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Return the registered provider keys without exposing the internal map. */
  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }
}
