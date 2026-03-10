"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { signInWithGoogle, signInWithCredentials } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { firstErrorMessage } from "@/lib/form-errors";
import { loginFormSchema } from "@/lib/validation/forms";


// Login form with Google OAuth + email/password credentials
export function LoginForm() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginFormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const formData = new FormData();
      formData.set("email", value.email);
      formData.set("password", value.password);

      try {
        await signInWithCredentials(formData);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to sign in. Check your credentials and try again.",
        );
      }
    },
  });

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signInWithGoogle();
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        {/* Google OAuth Button */}
        <Button
          variant="outline"
          className="w-full border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-6">
          <Separator className="bg-zinc-800" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-2 text-xs text-zinc-500">
            or continue with email
          </span>
        </div>

        {/* Credentials Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="email"
            validators={{ onChange: loginFormSchema.shape.email }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched && firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-400">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="admin@gwago.com"
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                  />
                  {error ? <p className="text-xs text-red-400">{error}</p> : null}
                </div>
              );
            }}
          </form.Field>
          <form.Field
            name="password"
            validators={{ onChange: loginFormSchema.shape.password }}
          >
            {(field) => {
              const error =
                field.state.meta.isTouched && firstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-400">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      setSubmitError(null);
                      field.handleChange(e.target.value);
                    }}
                    placeholder="********"
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                  />
                  {error ? <p className="text-xs text-red-400">{error}</p> : null}
                </div>
              );
            }}
          </form.Field>
          {submitError ? <p className="text-xs text-red-400">{submitError}</p> : null}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200"
                disabled={isGoogleLoading || isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-zinc-800 py-4">
        <p className="text-xs text-zinc-600">
          Access restricted to authorized admins only
        </p>
      </CardFooter>
    </Card>
  );
}

