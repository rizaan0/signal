import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-sm underline text-zinc-600 dark:text-zinc-400"
      >
        Sign out
      </button>
    </form>
  );
}
