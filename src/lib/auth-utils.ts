import { redirect } from "@tanstack/react-router";
import { supabase } from "./supabase";

export async function requireAuth() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw redirect({
      to: "/auth",
    });
  }

  return session;
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }

  return data;
}
