import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DECK } from "../store";
import { SprintGame } from "../components/sprint-game";
import { Room, Player, Ticket } from "../types";

interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SprintPlanioPage({
  params,
  searchParams,
}: PageProps) {
  const { roomId } = await params;
  const search = await searchParams;
  const playerName =
    typeof search.name === "string" ? search.name : "Anonymous";

  // 1. Fetch or Create Room
  let roomState: Room | null = null;
  let { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !roomData) {
    // Attempt to create room
    const { error: createError } = await supabase
      .from("rooms")
      .insert([{ id: roomId, status: "active", card_deck: DEFAULT_DECK }]);

    if (!createError) {
      roomState = {
        id: roomId,
        status: "active",
        card_deck: DEFAULT_DECK,
        is_revealed: false,
      } as Room;
    } else {
      // Fallback: Try fetching again in case of race condition
      const { data: retryData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (retryData) roomState = retryData;
    }
  } else {
    roomState = roomData;
  }

  // 2. Fetch Initial Data (Tickets & Existing Players)
  const [pUsers, pTickets] = await Promise.all([
    supabase.from("players").select("*").eq("room_id", roomId),
    supabase
      .from("tickets")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true }),
  ]);

  const initialPlayers = (pUsers.data as Player[]) || [];
  const initialTickets = (pTickets.data as Ticket[]) || [];

  return (
    <SprintGame
      roomId={roomId}
      initialRoomState={roomState}
      initialPlayers={initialPlayers}
      initialTickets={initialTickets}
      initialPlayerName={playerName}
    />
  );
}
