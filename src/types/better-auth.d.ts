declare module "better-auth/types" {
  interface User {
    role?: string;
    banned?: boolean;
    banReason?: string;
    banExpires?: Date;
  }

  interface Session {
    impersonatedBy?: string;
  }
}