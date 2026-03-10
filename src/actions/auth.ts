"use server"

import { signIn, signOut } from "@/lib/auth"

// Server action: Sign in with Google OAuth
export async function signInWithGoogle() {
    await signIn("google", { redirectTo: "/admin" })
}

// Server action: Sign in with email/password credentials
export async function signInWithCredentials(formData: FormData) {
    await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirectTo: "/admin",
    })
}

// Server action: Sign out and redirect to login
export async function handleSignOut() {
    await signOut({ redirectTo: "/" })
}
