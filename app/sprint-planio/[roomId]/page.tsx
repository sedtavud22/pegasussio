"use client";

import { useEffect, useState, use, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  Users,
  Copy,
  Check,
  Settings,
  X,
  Save,
  List,
  Play,
  CheckCircle,
  Plus,
} from "lucide-react";
import { PokerCard } from "../components/poker-card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const DEFAULT_DECK = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];

interface Player {
  id: string;
  name: string;
  vote: string | null;
  is_spectator: boolean;
}

interface Room {
  id: string;
  is_revealed: boolean;
  agenda_title?: string;
  card_deck?: string[];
  active_ticket_id?: string;
}

interface Ticket {
  id: string;
  title: string;
  score: string | null;
  status: "pending" | "active" | "completed";
}

function SprintPlanioGameContent({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") || "Anonymous";

  // Local State
  const [selected, setSelected] = useState<string | null>(null);

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deck, setDeck] = useState<string[]>(DEFAULT_DECK);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [tempAgenda, setTempAgenda] = useState("");
  const [tempDeck, setTempDeck] = useState("");
  const [newTicketTitle, setNewTicketTitle] = useState("");

  const hasAttemptedJoin = useRef(false);

  // Initial Join Logic
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setIsOffline(true);
      return;
    }

    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    const joinRoom = async () => {
      // 1. Check/Create Room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (roomError || !roomData) {
        const { error: createError } = await supabase
          .from("rooms")
          .insert([{ id: roomId, status: "active", card_deck: DEFAULT_DECK }]);

        if (createError) {
          // Retry fetch
          const { data: retryData } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();
          if (!retryData) {
            setIsOffline(true);
            return;
          }
          setRoomState(retryData);
          if (retryData.card_deck) setDeck(retryData.card_deck);
        } else {
          setRoomState({ id: roomId, is_revealed: false });
        }
      } else {
        setRoomState(roomData);
        if (roomData.card_deck) setDeck(roomData.card_deck);
      }

      // 2. Manage Player
      const storageKey = `sprint-planio-player:${roomId}`;
      const storedPlayerId = sessionStorage.getItem(storageKey);

      if (storedPlayerId) {
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("*")
          .eq("id", storedPlayerId)
          .single();
        if (existingPlayer) {
          setPlayerId(existingPlayer.id);
          return;
        }
      }

      const { data: playerData } = await supabase
        .from("players")
        .insert([{ room_id: roomId, name: playerName }])
        .select()
        .single();

      if (playerData) {
        setPlayerId(playerData.id);
        setPlayers((prev) => {
          if (prev.some((p) => p.id === playerData.id)) return prev;
          return [...prev, playerData];
        });
        sessionStorage.setItem(storageKey, playerData.id);
      }
    };

    joinRoom();
  }, [roomId, playerName]);

  // Subscriptions
  useEffect(() => {
    if (isOffline) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      // Room Updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newRoom = payload.new as Room;
          setRoomState(newRoom);
          if (
            newRoom.card_deck &&
            JSON.stringify(newRoom.card_deck) !== JSON.stringify(deck)
          ) {
            setDeck(newRoom.card_deck);
          }
        }
      )
      // Player Updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) =>
              prev.some((p) => p.id === (payload.new as Player).id)
                ? prev
                : [...prev, payload.new as Player]
            );
            toast.info(`${(payload.new as Player).name} joined!`);
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Player).id
                  ? (payload.new as Player)
                  : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      // Ticket Updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTickets((prev) => [...prev, payload.new as Ticket]);
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Ticket).id
                  ? (payload.new as Ticket)
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Initial Fetch
    const fetchData = async () => {
      const [pUsers, pTickets] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId),
        supabase
          .from("tickets")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true }),
      ]);
      if (pUsers.data) setPlayers(pUsers.data);
      if (pTickets.data) setTickets(pTickets.data as Ticket[]);
    };
    fetchData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isOffline]);

  // Actions
  const handleSelect = async (value: string) => {
    if (roomState?.is_revealed) return;
    if (selected === value) {
      setSelected(null);
      if (!isOffline && playerId)
        await supabase
          .from("players")
          .update({ vote: null })
          .eq("id", playerId);
    } else {
      setSelected(value);
      if (!isOffline && playerId)
        await supabase
          .from("players")
          .update({ vote: value })
          .eq("id", playerId);
    }
  };

  const handleReveal = async () => {
    if (isOffline) {
      setRoomState((prev) => (prev ? { ...prev, is_revealed: true } : null));
    } else {
      await supabase
        .from("rooms")
        .update({ is_revealed: true })
        .eq("id", roomId);
    }
  };

  const handleReset = async () => {
    setSelected(null);
    if (isOffline) {
      setRoomState((prev) => (prev ? { ...prev, is_revealed: false } : null));
    } else {
      await supabase
        .from("rooms")
        .update({ is_revealed: false })
        .eq("id", roomId);
      await supabase
        .from("players")
        .update({ vote: null })
        .eq("room_id", roomId);
    }
  };

  const handleAddTicket = async () => {
    if (!newTicketTitle.trim()) return;
    if (isOffline) {
      const fakeTicket: Ticket = {
        id: crypto.randomUUID(),
        title: newTicketTitle,
        score: null,
        status: "pending",
      };
      setTickets((prev) => [...prev, fakeTicket]);
      setNewTicketTitle("");
      setShowAddTicket(false);
      return;
    }

    const { error } = await supabase.from("tickets").insert([
      {
        room_id: roomId,
        title: newTicketTitle,
        status: "pending",
      },
    ]);

    if (error) toast.error("Failed to add ticket");
    else {
      setNewTicketTitle("");
      setShowAddTicket(false);
    }
  };

  const handleSetActiveTicket = async (ticketId: string) => {
    if (isOffline) {
      setRoomState((prev) =>
        prev ? { ...prev, active_ticket_id: ticketId } : null
      );
      return;
    }

    // Update room active ticket
    await supabase
      .from("rooms")
      .update({ active_ticket_id: ticketId })
      .eq("id", roomId);
    // Update ticket status
    await supabase
      .from("tickets")
      .update({ status: "active" })
      .eq("id", ticketId);
  };

  const handleSaveScore = async (score: string) => {
    if (!roomState?.active_ticket_id) return;
    if (isOffline) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === roomState.active_ticket_id
            ? { ...t, score, status: "completed" }
            : t
        )
      );
      return;
    }

    await supabase
      .from("tickets")
      .update({ score, status: "completed" })
      .eq("id", roomState.active_ticket_id);

    toast.success("Score saved!");
  };

  const handleSaveSettings = async () => {
    const cleanDeck = tempDeck
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleanDeck.length === 0) {
      toast.error("Deck cannot be empty");
      return;
    }

    if (isOffline) {
      setDeck(cleanDeck);
      setShowSettings(false);
      return;
    }

    const { error } = await supabase
      .from("rooms")
      .update({ card_deck: cleanDeck })
      .eq("id", roomId);
    if (error) toast.error("Failed to update settings");
    else setShowSettings(false);
  };

  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id
  );
  const revealed = roomState?.is_revealed;

  const numericVotes = players
    .map((p) => parseFloat(p.vote || "0"))
    .filter((v) => !isNaN(v) && v > 0);
  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(
          1
        )
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-4">
          <Link
            href="/sprint-planio"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Sprint Planio{" "}
              {isOffline && (
                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  OFFLINE
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTempDeck(deck.join(", "));
              setShowSettings(true);
            }}
            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              setIsCopied(true);
              toast.success("Link copied!");
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {isCopied ? (
              <Check className="h-5 w-5" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 rounded-full dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        </div>
      </header>

      {/* Banner: Active Ticket */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center">
        {activeTicket ? (
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              <span className="text-blue-500">#{activeTicket.title}</span>
            </h2>
            {activeTicket.score && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold ml-2">
                Score: {activeTicket.score}
              </span>
            )}
          </div>
        ) : (
          <p className="text-zinc-400 italic">
            No agenda selected. Choose one from the list.
          </p>
        )}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
        {/* CENTER: Stage */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px]">
            {/* Players Grid */}
            <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300 mb-8">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={cn(
                      "relative h-28 w-20 sm:h-32 sm:w-24 rounded-xl border-2 flex items-center justify-center shadow-xl transition-all duration-300 transform",
                      revealed &&
                        p.vote &&
                        "border-blue-600 bg-white dark:bg-zinc-900 dark:border-blue-500 rotate-y-0",
                      revealed &&
                        !p.vote &&
                        "border-zinc-200 bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 opacity-50",
                      !revealed &&
                        p.vote &&
                        "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-600 scale-105",
                      !revealed &&
                        !p.vote &&
                        "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50"
                    )}
                  >
                    {revealed ? (
                      <span
                        className={cn(
                          "text-3xl sm:text-4xl font-bold",
                          p.vote
                            ? "text-blue-600 dark:text-blue-500"
                            : "text-zinc-400"
                        )}
                      >
                        {p.vote ?? "-"}
                      </span>
                    ) : p.vote ? (
                      <span className="text-white font-bold opacity-50 tracking-widest text-[10px]">
                        READY
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700 text-xl font-bold animate-pulse">
                        ?
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs sm:text-sm font-medium truncate max-w-[100px]",
                      p.id === playerId ? "text-blue-600" : "text-zinc-500"
                    )}
                  >
                    {p.name} {p.id === playerId && "(You)"}
                  </span>
                </div>
              ))}
              {isOffline && players.length === 0 && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "relative h-32 w-24 rounded-xl border-2 flex items-center justify-center shadow-xl",
                      selected
                        ? "border-blue-600"
                        : "border-dashed border-zinc-300"
                    )}
                  >
                    <span className="text-4xl font-bold text-blue-600">
                      {selected || "-"}
                    </span>
                  </div>
                  <span className="text-sm">Me</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6">
              {!revealed && (selected || players.some((p) => p.vote)) && (
                <div className="animate-in fade-in slide-in-from-bottom-4 text-center">
                  <button
                    onClick={handleReveal}
                    className="flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-black rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Eye className="h-5 w-5" /> Reveal Cards
                  </button>
                  <p className="text-xs mt-2 text-zinc-400">
                    {players.filter((p) => p.vote).length}/{players.length}{" "}
                    voted
                  </p>
                </div>
              )}

              {revealed && average && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-6 rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col items-center">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">
                      Average
                    </p>
                    <p className="text-6xl font-bold text-blue-700 dark:text-blue-300">
                      {average}
                    </p>
                  </div>
                  {/* Save Score Button */}
                  {activeTicket && !activeTicket.score && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleSaveScore(average)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors"
                      >
                        Use Average ({average})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hand */}
          <div className="w-full max-w-3xl border-t border-zinc-200 dark:border-zinc-800 pt-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {deck.map((val) => (
                <PokerCard
                  key={val}
                  value={val}
                  selected={selected === val}
                  onClick={() => handleSelect(val)}
                  className={cn(
                    revealed &&
                      selected !== val &&
                      "opacity-25 grayscale cursor-not-allowed",
                    revealed && selected === val && "ring-4 ring-blue-500"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR: Tickets & Players */}
        <div className="w-full lg:w-80 flex flex-col gap-8 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-8 lg:pt-0 lg:pl-8">
          {/* AGENDA SECTION */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
                <List className="h-4 w-4" /> Agenda
              </h3>
              <button
                onClick={() => setShowAddTicket(!showAddTicket)}
                className="p-1 hover:bg-zinc-100 rounded dark:hover:bg-zinc-800"
              >
                {showAddTicket ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>

            {showAddTicket && (
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <input
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Enter ticket title..."
                  className="w-full text-sm p-2 rounded mb-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-black"
                  autoFocus
                />
                <button
                  onClick={handleAddTicket}
                  className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg"
                >
                  Add Ticket
                </button>
              </div>
            )}

            <ul className="space-y-2 max-h-[300px] overflow-y-auto">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex items-center justify-between group",
                    activeTicket?.id === t.id
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "bg-white border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-300"
                  )}
                >
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        activeTicket?.id === t.id &&
                          "text-blue-700 dark:text-blue-300"
                      )}
                    >
                      {t.title}
                    </span>
                    {t.score && (
                      <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded w-fit">
                        {t.score}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeTicket?.id !== t.id && (
                      <button
                        onClick={() => handleSetActiveTicket(t.id)}
                        title="Play this ticket"
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-100 rounded-full"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {t.score && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </li>
              ))}
              {tickets.length === 0 && (
                <li className="text-sm text-zinc-400 italic text-center py-4">
                  No tickets yet. Add one!
                </li>
              )}
            </ul>
          </div>

          {/* PLAYERS SECTION */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              <Users className="h-4 w-4" /> Players ({players.length})
            </h3>
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={cn(
                        "text-sm",
                        p.id === playerId && "font-bold_"
                      )}
                    >
                      {p.name} {p.id === playerId && "(You)"}
                    </span>
                  </div>
                  {p.vote && (
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl shadow-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Settings</h2>
                <button onClick={() => setShowSettings(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Card Deck
                </label>
                <input
                  value={tempDeck}
                  onChange={(e) => setTempDeck(e.target.value)}
                  className="w-full border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900"
                  placeholder="0, 1, 2, 3..."
                />
                <button
                  onClick={handleSaveSettings}
                  className="w-full mt-4 bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SprintPlanioGame({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <SprintPlanioGameContent roomId={roomId} />
    </Suspense>
  );
}
