"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

// Server action: Sign in with Google OAuth
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/admin" });
}

// Server action: Sign in with email/password credentials
export async function signInWithCredentials(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }

      return { error: "Unable to sign in. Please try again." };
    }

    // Allow framework redirects and unexpected errors to bubble up.
    throw error;
  }
}

// Server action: Sign out and redirect to login
export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
