import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface SetupConfig {
  postgresConfig: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  oidcConfig: {
    provider: string;
    providerName: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    secret: string;
    scopes?: string[];
  };
  atlasConfig: {
    baseUrl: string;
    atlasUrl: string;
    atlasApiKey: string;
    websocketUrl: string;
  };
  brandingConfig: {
    displayName: string;
    logo?: string;
    primaryColor: string;
    backgroundImage?: string;
  };
  completedAt: string;
  version: string;
}

class ConfigManager {
  private cache: SetupConfig | null = null;
  private cacheTimestamp: number = 0;

  private loadConfig(): SetupConfig | null {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return null;
      }

      const stat = fs.statSync(CONFIG_FILE);

      if (this.cache && stat.mtimeMs <= this.cacheTimestamp) {
        return this.cache;
      }

      const configData = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(configData) as SetupConfig;

      this.cache = config;
      this.cacheTimestamp = stat.mtimeMs;

      return config;
    } catch (error) {
      console.error("Failed to load config:", error);
      return null;
    }
  }

  public getConfig(): SetupConfig | null {
    return this.loadConfig();
  }

  public getPostgresConfig() {
    const config = this.getConfig();
    return config?.postgresConfig || null;
  }

  public getOidcConfig() {
    const config = this.getConfig();
    return config?.oidcConfig || null;
  }

  public getAtlasConfig() {
    const config = this.getConfig();
    return config?.atlasConfig || null;
  }

  public getBrandingConfig() {
    const config = this.getConfig();
    return config?.brandingConfig || null;
  }

  public isSetupCompleted(): boolean {
    const config = this.getConfig();
    return config?.completedAt != null;
  }

  public invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

const configManager = new ConfigManager();
export default configManager;
