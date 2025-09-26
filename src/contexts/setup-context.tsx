import React, { ReactNode, createContext, useContext, useState } from "react";

interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface OIDCConfig {
  provider: string;
  providerName: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface AtlasConfig {
  baseUrl: string;
  atlasUrl: string;
  atlasApiKey: string;
}

interface BrandingConfig {
  displayName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  backgroundImage: string;
}

interface SetupState {
  currentStep: number;
  postgresConfig: PostgresConfig;
  oidcConfig: OIDCConfig;
  atlasConfig: AtlasConfig;
  brandingConfig: BrandingConfig;
  postgresTestPassed: boolean;
  oidcTestPassed: boolean;
}

interface SetupContextType {
  state: SetupState;
  updatePostgresConfig: (_config: Partial<PostgresConfig>) => void;
  updateOIDCConfig: (_config: Partial<OIDCConfig>) => void;
  updateAtlasConfig: (_config: Partial<AtlasConfig>) => void;
  updateBrandingConfig: (_config: Partial<BrandingConfig>) => void;
  setCurrentStep: (_step: number) => void;
  setPostgresTestPassed: (_passed: boolean) => void;
  setOIDCTestPassed: (_passed: boolean) => void;
  canProceedToStep: (_step: number) => boolean;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const SetupProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<SetupState>({
    currentStep: 0,
    postgresConfig: {
      host: "localhost",
      port: 5432,
      database: "",
      username: "",
      password: "",
    },
    oidcConfig: {
      provider: "discord",
      providerName: "Discord",
      clientId: "",
      clientSecret: "",
      authorizationUrl: "https://discord.com/api/oauth2/authorize",
      tokenUrl: "https://discord.com/api/oauth2/token",
      userInfoUrl: "https://discord.com/api/users/@me",
      scopes: ["identify", "email"],
    },
    atlasConfig: {
      baseUrl: "",
      atlasUrl: "",
      atlasApiKey: "",
    },
    brandingConfig: {
      displayName: "Atlas",
      logo: "/logo.png",
      favicon: "/favicon.ico",
      primaryColor: "#3b82f6",
      backgroundImage: "/bg-darker.jpg",
    },
    postgresTestPassed: false,
    oidcTestPassed: false,
  });

  const updatePostgresConfig = (config: Partial<PostgresConfig>) => {
    setState((prev) => ({
      ...prev,
      postgresConfig: { ...prev.postgresConfig, ...config },
      postgresTestPassed: false,
    }));
  };

  const updateOIDCConfig = (config: Partial<OIDCConfig>) => {
    setState((prev) => ({
      ...prev,
      oidcConfig: { ...prev.oidcConfig, ...config },
      oidcTestPassed: false,
    }));
  };

  const updateAtlasConfig = (config: Partial<AtlasConfig>) => {
    setState((prev) => ({
      ...prev,
      atlasConfig: { ...prev.atlasConfig, ...config },
    }));
  };

  const updateBrandingConfig = (config: Partial<BrandingConfig>) => {
    setState((prev) => ({
      ...prev,
      brandingConfig: { ...prev.brandingConfig, ...config },
    }));
  };

  const setCurrentStep = (step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const setPostgresTestPassed = (passed: boolean) => {
    setState((prev) => ({ ...prev, postgresTestPassed: passed }));
  };

  const setOIDCTestPassed = (passed: boolean) => {
    setState((prev) => ({ ...prev, oidcTestPassed: passed }));
  };

  const canProceedToStep = (step: number): boolean => {
    if (step <= 1) return true;
    if (step === 2) return state.postgresTestPassed;
    if (step === 3) return state.postgresTestPassed && state.oidcTestPassed;
    if (step >= 4) return state.postgresTestPassed && state.oidcTestPassed;
    return false;
  };

  return (
    <SetupContext.Provider
      value={{
        state,
        updatePostgresConfig,
        updateOIDCConfig,
        updateAtlasConfig,
        updateBrandingConfig,
        setCurrentStep,
        setPostgresTestPassed,
        setOIDCTestPassed,
        canProceedToStep,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
};

export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
};
