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
  Pencil,
  RotateCcw,
  Trash2,
  Edit3,
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

interface VoteSnapshot {
  name: string;
  vote: string;
  id: string;
}

interface Ticket {
  id: string;
  title: string;
  score: string | null;
  status: "pending" | "active" | "completed";
  votes_snapshot?: VoteSnapshot[];
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
  const [deck, setDeck] = useState<string[]>(DEFAULT_DECK);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [tempAgenda, setTempAgenda] = useState("");
  const [tempDeck, setTempDeck] = useState("");
  const [newTicketTitle, setNewTicketTitle] = useState("");

  // Scoring & Editing State
  const [customScore, setCustomScore] = useState("");
  const [editingTicket, setEditingTicket] = useState<{
    id: string;
    title: string;
    score: string;
  } | null>(null);
  const [renamingTicket, setRenamingTicket] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const hasAttemptedJoin = useRef(false);

  // Initial Join Logic
  useEffect(() => {
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
          const { data: retryData } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", roomId)
            .single();
          if (!retryData) {
            toast.error("Failed to join room. Please try again.");
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

      // 2. Fetch Initial Data (Tickets & Existing Players)
      const [pUsers, pTickets] = await Promise.all([
        supabase.from("players").select("*").eq("room_id", roomId),
        supabase
          .from("tickets")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true }),
      ]);

      if (pTickets.data) setTickets(pTickets.data as Ticket[]);

      let currentPlayers = pUsers.data ? (pUsers.data as Player[]) : [];
      setPlayers(currentPlayers);

      // 3. Manage Player (Join)
      const storageKey = `sprint-planio-player:${roomId}`;
      const storedPlayerId = sessionStorage.getItem(storageKey);

      let finalPlayerId: string | null = null;

      if (storedPlayerId) {
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("*")
          .eq("id", storedPlayerId)
          .single();
        if (existingPlayer) {
          setPlayerId(existingPlayer.id);
          finalPlayerId = existingPlayer.id;
          if (!currentPlayers.some((p) => p.id === finalPlayerId)) {
            setPlayers((prev) => [...prev, existingPlayer]);
          }
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
        finalPlayerId = playerData.id;
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
    const channel = supabase
      .channel(`room:${roomId}`)
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
        },
      )
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
                : [...prev, payload.new as Player],
            );
            // Optional: toast.info(`${(payload.new as Player).name} joined!`);
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Player).id
                  ? (payload.new as Player)
                  : p,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      // Ticket Updates (INSERT/UPDATE)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setTickets((prev) => [...prev, payload.new as Ticket]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === (payload.new as Ticket).id ? (payload.new as Ticket) : t,
            ),
          );
        },
      )
      // Ticket Deletes (Unfiltered, check existence)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          setTickets((prev) => {
            if (prev.some((t) => t.id === payload.old.id)) {
              return prev.filter((t) => t.id !== payload.old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Derived Values
  const activeTicket = tickets.find(
    (t) => t.id === roomState?.active_ticket_id,
  );
  const isViewOnly = activeTicket?.status === "completed";
  const revealed = isViewOnly ? true : roomState?.is_revealed;

  const displayPlayers =
    isViewOnly && activeTicket?.votes_snapshot
      ? activeTicket.votes_snapshot.map(
          (s) =>
            ({
              id: s.id,
              name: s.name,
              vote: s.vote,
              is_spectator: false,
            }) as Player,
        )
      : players;

  const numericVotes = displayPlayers
    .map((p) => parseFloat(p.vote || "0"))
    .filter((v) => !isNaN(v) && v > 0);
  const average =
    numericVotes.length > 0
      ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(
          1,
        )
      : null;
  const displayAverage =
    isViewOnly && activeTicket?.score ? activeTicket.score : average;

  // Initialize custom score
  useEffect(() => {
    if (revealed && average && !isViewOnly) {
      setCustomScore(average);
    }
  }, [revealed, average, isViewOnly]);

  // Actions
  const handleSelect = async (value: string) => {
    if (isViewOnly || roomState?.is_revealed) return;

    if (selected === value) {
      setSelected(null);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: null })
          .eq("id", playerId);
    } else {
      setSelected(value);
      if (playerId)
        await supabase
          .from("players")
          .update({ vote: value })
          .eq("id", playerId);
    }
  };

  const handleReveal = async () => {
    await supabase.from("rooms").update({ is_revealed: true }).eq("id", roomId);
  };

  const handleReset = async () => {
    setSelected(null);
    await supabase
      .from("rooms")
      .update({ is_revealed: false })
      .eq("id", roomId);
    await supabase.from("players").update({ vote: null }).eq("room_id", roomId);
  };

  const handleAddTicket = async () => {
    if (!newTicketTitle.trim()) return;

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

  const handleRenameTicket = async () => {
    if (!renamingTicket || !renamingTicket.title.trim()) return;

    const { error } = await supabase
      .from("tickets")
      .update({ title: renamingTicket.title })
      .eq("id", renamingTicket.id);

    if (error) toast.error("Failed to rename ticket");
    else setRenamingTicket(null);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this agenda?")) return;

    if (activeTicket?.id === ticketId) {
      await supabase
        .from("rooms")
        .update({ active_ticket_id: null, is_revealed: false })
        .eq("id", roomId);
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);
    if (error) toast.error("Failed to delete ticket");
    else {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      toast.success("Agenda deleted");
    }
  };

  const handleSetActiveTicket = async (ticket: Ticket) => {
    setSelected(null);

    const isCompleted = ticket.status === "completed";
    const updates: any = { active_ticket_id: ticket.id };

    if (!isCompleted) {
      updates.is_revealed = false;
    }

    await supabase.from("rooms").update(updates).eq("id", roomId);

    if (!isCompleted) {
      await supabase
        .from("tickets")
        .update({ status: "active" })
        .eq("id", ticket.id);
      await supabase
        .from("players")
        .update({ vote: null })
        .eq("room_id", roomId);
    }
  };

  // Save Score + Snapshot
  const handleSaveScore = async () => {
    const scoreToSave = customScore || average;
    if (!roomState?.active_ticket_id || !scoreToSave) return;

    const snapshot: VoteSnapshot[] = players
      .filter((p) => p.vote)
      .map((p) => ({ id: p.id, name: p.name, vote: p.vote! }));

    const { error } = await supabase
      .from("tickets")
      .update({
        score: scoreToSave,
        status: "completed",
        votes_snapshot: snapshot,
      })
      .eq("id", roomState.active_ticket_id);

    if (error) {
      console.error(error);
      toast.error("Failed to save score");
    } else toast.success("Score saved!");
  };

  const handleUpdateTicketScore = async () => {
    if (!editingTicket) return;

    const { error } = await supabase
      .from("tickets")
      .update({ score: editingTicket.score })
      .eq("id", editingTicket.id);

    if (error) toast.error("Failed to update score");
    else setEditingTicket(null);
  };

  const handleRevote = async (ticket: Ticket) => {
    await supabase
      .from("rooms")
      .update({ active_ticket_id: ticket.id, is_revealed: false })
      .eq("id", roomId);
    await supabase
      .from("tickets")
      .update({ status: "active", score: null, votes_snapshot: null })
      .eq("id", ticket.id);
    await supabase.from("players").update({ vote: null }).eq("room_id", roomId);
    setSelected(null);

    toast.info(`Revoting on ${ticket.title}`);
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

    const { error } = await supabase
      .from("rooms")
      .update({ card_deck: cleanDeck })
      .eq("id", roomId);
    if (error) toast.error("Failed to update settings");
    else setShowSettings(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    toast.success("Room ID copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

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
              Sprint Planio
            </h1>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              Room: <span className="font-mono">{roomId.slice(0, 8)}...</span>
            </span>
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
            onClick={copyRoomId}
            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Copy Room ID"
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
              {isViewOnly && (
                <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded">
                  View Only (Completed)
                </span>
              )}
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
            {/* Players Grid (or Snapshots) */}
            <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300 mb-8">
              {displayPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={cn(
                      "relative h-28 w-20 sm:h-32 sm:w-24 rounded-xl border-2 flex items-center justify-center shadow-xl transition-all duration-300 transform",
                      // Revealed (IsViewOnly is always revealed)
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
                        "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50",
                    )}
                  >
                    {revealed ? (
                      <span
                        className={cn(
                          "text-3xl sm:text-4xl font-bold",
                          p.vote
                            ? "text-blue-600 dark:text-blue-500"
                            : "text-zinc-400",
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
                      p.id === playerId ? "text-blue-600" : "text-zinc-500",
                    )}
                  >
                    {p.name} {p.id === playerId && "(You)"}
                  </span>
                </div>
              ))}
              {/* Fallback msg if snapshot empty */}
              {isViewOnly && displayPlayers.length === 0 && (
                <p className="text-zinc-400 italic">
                  No votes recorded for this session.
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6">
              {/* Only show Reveal button if NOT ViewOnly */}
              {!isViewOnly &&
                !revealed &&
                (selected || players.some((p) => p.vote)) && (
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

              {revealed && (displayAverage || average) && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col items-center mb-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">
                      {isViewOnly ? "Final Score" : "Average"}
                    </p>
                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                      {displayAverage}
                    </p>
                  </div>

                  {/* Save Custom Score (Only if NOT view only and NOT saved yet) */}
                  {activeTicket && !activeTicket.score && !isViewOnly && (
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                      <input
                        type="text"
                        value={customScore}
                        onChange={(e) => setCustomScore(e.target.value)}
                        className="w-20 text-center font-bold text-lg bg-transparent border-none outline-none focus:ring-0"
                        placeholder={average || "-"}
                      />
                      <button
                        onClick={handleSaveScore}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hand (Disable if ViewOnly) */}
          <div
            className={cn(
              "w-full max-w-3xl border-t border-zinc-200 dark:border-zinc-800 pt-8",
              isViewOnly && "opacity-50 pointer-events-none grayscale",
            )}
          >
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
                    revealed && selected === val && "ring-4 ring-blue-500",
                  )}
                />
              ))}
            </div>
            {isViewOnly && (
              <p className="text-center text-xs text-zinc-400 mt-2">
                Voting is closed for this ticket.
              </p>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
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
                    "p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer", // Added cursor-pointer
                    activeTicket?.id === t.id
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "bg-white border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-300",
                  )}
                  onClick={() =>
                    t.id !== activeTicket?.id && handleSetActiveTicket(t)
                  } // Allow clicking row to view/set active
                >
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        activeTicket?.id === t.id &&
                          "text-blue-700 dark:text-blue-300",
                      )}
                    >
                      {t.title}
                    </span>
                    {t.score && (
                      <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded w-fit mt-1">
                        Score: {t.score}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Play Button (if not active and NOT completed) */}
                    {activeTicket?.id !== t.id && t.status !== "completed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetActiveTicket(t);
                        }}
                        title="Vote now"
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}

                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Rename */}
                      <button
                        onClick={() =>
                          setRenamingTicket({ id: t.id, title: t.title })
                        }
                        title="Rename"
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-100 rounded-full"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteTicket(t.id)}
                        title="Delete"
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-100 rounded-full"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Completed Actions */}
                      {t.score && (
                        <>
                          <button
                            onClick={() =>
                              setEditingTicket({
                                id: t.id,
                                title: t.title,
                                score: t.score || "",
                              })
                            }
                            title="Edit Score"
                            className="p-1.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-100 rounded-full"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRevote(t)}
                            title="Revote"
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-100 rounded-full"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Completed Check */}
                    {t.status === "completed" && !t.score && (
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
              {displayPlayers.map((p) => (
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
                        p.id === playerId && "font-bold",
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

        {/* Global Modals */}

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

        {/* Rename Modal */}
        {renamingTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-3xl shadow-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold mb-4">Rename Agenda</h3>
              <input
                value={renamingTicket.title}
                onChange={(e) =>
                  setRenamingTicket({
                    ...renamingTicket,
                    title: e.target.value,
                  })
                }
                className="w-full border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900 mb-4 font-medium"
                autoFocus
                placeholder="Enter new title"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRenamingTicket(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameTicket}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Score Modal */}
        {editingTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-3xl shadow-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold mb-4">
                Edit Score: {editingTicket.title}
              </h3>
              <input
                value={editingTicket.score}
                onChange={(e) =>
                  setEditingTicket({ ...editingTicket, score: e.target.value })
                }
                className="w-full border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900 mb-4 font-bold text-center text-xl"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTicket(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTicketScore}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold"
                >
                  Update
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
