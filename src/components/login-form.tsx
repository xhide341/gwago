"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { signInWithGoogle, signInWithCredentials } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { firstErrorMessage } from "@/lib/form-errors";
import { loginFormSchema } from "@/lib/validation/forms";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
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

      const result = await signInWithCredentials(formData);
      if (result?.error) {
        setSubmitError(result.error);
      }
    },
  });

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signInWithGoogle();
  }

  async function handleGuestSignIn() {
    setIsGuestLoading(true);
    setSubmitError(null);
    const formData = new FormData();
    formData.set("email", "guest@gwago.com");
    formData.set("password", "guest");
    const result = await signInWithCredentials(formData);
    if (result?.error) {
      setSubmitError(result.error);
      setIsGuestLoading(false);
    }
  }

  return (
    <>
      <Card className="gap-4 border-zinc-200 bg-white/95 pt-4 pb-6 shadow-md backdrop-blur-sm transition-colors dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-none">
        <CardHeader className="gap-0.5 pb-0 text-center">
          <h1 className="text-primary text-3xl font-bold tracking-tight">GwAGO</h1>
          <p className="text-sm text-zinc-500">Admin Portal</p>
        </CardHeader>
        <CardContent className="pt-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="email" validators={{ onChange: loginFormSchema.shape.email }}>
              {(field) => {
                const error =
                  field.state.meta.isTouched && firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-zinc-700 dark:text-zinc-400"
                    >
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
                      className="focus-visible:border-primary focus-visible:ring-primary/25 dark:text-primary h-11 border-zinc-300 bg-white px-4 text-base font-normal tracking-wide text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 md:text-base dark:border-zinc-700 dark:bg-zinc-900/80 dark:placeholder:text-zinc-500"
                    />
                    {error ? <p className="pl-1 text-xs text-red-400">{error}</p> : null}
                  </div>
                );
              }}
            </form.Field>
            <form.Field name="password" validators={{ onChange: loginFormSchema.shape.password }}>
              {(field) => {
                const error =
                  field.state.meta.isTouched && firstErrorMessage(field.state.meta.errors);

                return (
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-zinc-700 dark:text-zinc-400"
                    >
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
                      className="focus-visible:border-primary focus-visible:ring-primary/25 dark:text-primary h-11 border-zinc-300 bg-white px-4 text-base font-normal tracking-wide text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 md:text-base dark:border-zinc-700 dark:bg-zinc-900/80 dark:placeholder:text-zinc-500"
                    />
                    {error ? <p className="pl-1 text-xs text-red-400">{error}</p> : null}
                  </div>
                );
              }}
            </form.Field>
            {submitError ? <p className="text-xs text-red-400">{submitError}</p> : null}
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="h-11 w-full bg-zinc-900 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  disabled={isGoogleLoading || isGuestLoading || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="relative my-6">
            <Separator className="bg-zinc-200 dark:bg-zinc-800" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-zinc-500 dark:bg-zinc-950">
              or continue with
            </span>
          </div>

          <Button
            variant="outline"
            className="text-primary h-11 w-full border-zinc-300 bg-white text-base font-medium tracking-wide hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isGuestLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <span>Sign in with</span>
                <svg
                  className="h-4 w-4"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <g clipPath="url(#google-logo-clip)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M39.2 20.4546C39.2 19.0364 39.0727 17.6728 38.8364 16.3637H20V24.1H30.7636C30.3 26.6 28.8909 28.7182 26.7727 30.1364V35.1546H33.2364C37.0182 31.6728 39.2 26.5455 39.2 20.4546Z"
                      fill="#4285F4"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M20 40C25.4 40 29.9273 38.2091 33.2364 35.1545L26.7727 30.1363C24.9818 31.3363 22.6909 32.0454 20 32.0454C14.7909 32.0454 10.3818 28.5273 8.80909 23.8H2.12727V28.9818C5.41818 35.5182 12.1818 40 20 40Z"
                      fill="#34A853"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.80909 23.8C8.40909 22.6 8.18182 21.3182 8.18182 20C8.18182 18.6818 8.40909 17.4 8.80909 16.2V11.0182H2.12727C0.772727 13.7182 0 16.7727 0 20C0 23.2273 0.772727 26.2818 2.12727 28.9818L8.80909 23.8Z"
                      fill="#FBBC05"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M20 7.95455C22.9364 7.95455 25.5727 8.96364 27.6455 10.9455L33.3818 5.20909C29.9182 1.98182 25.3909 0 20 0C12.1818 0 5.41818 4.48182 2.12727 11.0182L8.80909 16.2C10.3818 11.4727 14.7909 7.95455 20 7.95455Z"
                      fill="#EA4335"
                    />
                  </g>
                  <defs>
                    <clipPath id="google-logo-clip">
                      <rect width="40" height="40" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="text-primary rounded-sm border-zinc-300 bg-white text-base hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          disabled={isGoogleLoading || isGuestLoading}
          onClick={handleGuestSignIn}
        >
          {isGuestLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            </>
          ) : (
            "Preview as Guest"
          )}
        </Button>
      </div>
    </>
  );
}
