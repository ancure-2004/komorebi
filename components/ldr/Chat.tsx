"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Camera,
  Mic,
  X,
  Sparkles,
  Play,
  Check,
  CheckCheck,
  Shield,
  Loader2,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Volume2,
} from "lucide-react";
import { supabase, Message, useSession } from "@/lib/supabase";
import { useRoom, ChatPayload } from "@/lib/room";
import { toSquareJpeg, sendMedia, consumeMedia } from "@/lib/media";
import { haptics } from "@/lib/haptics";

export interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Immutable upsert helper to prevent duplicate messages and duplicate key errors
function upsertMessage(list: Message[], incoming: Message): Message[] {
  const index = list.findIndex((m) => m.id === incoming.id);
  if (index >= 0) {
    const updated = [...list];
    updated[index] = { ...updated[index], ...incoming };
    return updated;
  }
  return [...list, incoming];
}

// Pre-generate ash/dust particles for Thanos snap disintegration animation
interface Particle {
  id: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  rotate: number;
  duration: number;
  delay: number;
  color: string;
}

function generateThanosParticles(count = 64): Particle[] {
  const colors = [
    "rgba(244, 194, 200, 0.9)", // sakura pink
    "rgba(214, 199, 178, 0.85)", // paper sand
    "rgba(140, 122, 107, 0.8)", // ash mocha
    "rgba(125, 157, 139, 0.85)", // sage dust
    "rgba(224, 185, 120, 0.9)", // golden ember
    "rgba(60, 50, 45, 0.75)", // dark ash
  ];

  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 160;
    return {
      id: i,
      startX: (Math.random() - 0.5) * 220,
      startY: (Math.random() - 0.5) * 260,
      driftX: Math.cos(angle) * distance,
      driftY: -Math.abs(Math.sin(angle) * distance) - Math.random() * 80, // float upwards like ash
      size: 2 + Math.random() * 5,
      rotate: (Math.random() - 0.5) * 360,
      duration: 0.8 + Math.random() * 0.5,
      delay: Math.random() * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
}

export default function Chat({ isOpen, onClose, className = "" }: ChatProps) {
  const session = useSession();
  const room = useRoom();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Infer user identity with fallback to known user IDs
  const isCaptain =
    session.role === "captain" ||
    room.role === "captain" ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/captain"));

  const activeUid =
    session.uid ||
    (isCaptain
      ? "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8"
      : "a0ba3cb9-5397-498b-8740-5b9842381d15");

  // Camera Options Menu & Live Camera Viewfinder State
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Polaroid Preview / Developing State
  const [developedPolaroid, setDevelopedPolaroid] = useState<{
    url: string;
    messageId: string;
  } | null>(null);
  const [polaroidTimeLeft, setPolaroidTimeLeft] = useState(30);
  const [isPolaroidDisintegrating, setIsPolaroidDisintegrating] = useState(false);
  const [isDevelopingLoading, setIsDevelopingLoading] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback Overlay State (Countdown + Reactive Bars + Thanos Snap)
  const [activeVoiceNote, setActiveVoiceNote] = useState<{
    url: string;
    messageId: string;
  } | null>(null);
  const [voiceTimeLeft, setVoiceTimeLeft] = useState(0);
  const [isVoiceDisintegrating, setIsVoiceDisintegrating] = useState(false);
  const [audioBars, setAudioBars] = useState<number[]>(Array(24).fill(20));
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const thanosParticles = useMemo(() => generateThanosParticles(68), []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  // Load active messages & subscribe to changes + broadcast
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && mounted) {
          const visible = (data as Message[]).filter(
            (m) => !m.text?.startsWith("SIGNAL:") && !m.body?.startsWith("SIGNAL:")
          );
          setMessages(visible);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.warn("Could not load messages:", err);
      }
    }

    loadMessages();

    // Subscribe to Postgres changes on messages table
    const channel = supabase
      .channel("sanctuary-messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as Message;
            if (newRow.text?.startsWith("SIGNAL:") || newRow.body?.startsWith("SIGNAL:")) {
              return;
            }
            setMessages((prev) => upsertMessage(prev, newRow));
            setTimeout(scrollToBottom, 100);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Message;
            setMessages((prev) => upsertMessage(prev, updated));
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Register broadcast listener for peer-to-peer real-time delivery
    const unregisterRoom = room.registerHandlers({
      onChat: (payload: ChatPayload) => {
        const incoming: Message = {
          id: payload.id,
          sender_id: payload.sender_id || payload.sender,
          sender: payload.sender,
          text: payload.text || payload.body || null,
          body: payload.body || payload.text || null,
          type: payload.kind,
          kind: payload.kind,
          media_path: payload.media_path || null,
          consumed: payload.consumed ?? false,
          viewed_at: payload.viewed_at ?? null,
          created_at: payload.created_at || new Date().toISOString(),
        };
        setMessages((prev) => upsertMessage(prev, incoming));
        setTimeout(scrollToBottom, 100);
      },
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      unregisterRoom();
    };
  }, [isOpen, scrollToBottom, room]);

  // Send Text Message
  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");
    haptics.light();

    // Unique UUID generated client-side upfront
    const messageId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: messageId,
      sender_id: activeUid,
      sender: activeUid,
      text,
      body: text,
      type: "text",
      kind: "text",
      media_path: null,
      consumed: false,
      viewed_at: null,
      created_at: new Date().toISOString(),
    };

    // Optimistically show on sender's screen
    setMessages((prev) => upsertMessage(prev, optimisticMsg));
    setTimeout(scrollToBottom, 50);

    // Broadcast over WebSocket room with identical UUID
    room.send("chat", optimisticMsg);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          id: messageId,
          sender_id: activeUid,
          sender: activeUid,
          text,
          body: text,
          type: "text",
          kind: "text",
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => upsertMessage(prev, data as Message));
      }
    } catch (err) {
      console.warn("Failed to persist text message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Start Live Camera Viewfinder
  const startCamera = async (facing: "user" | "environment" = "user") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // Fallback to file picker if camera API is unsupported
      fileInputRef.current?.click();
      return;
    }

    setShowPhotoOptions(false);
    setIsCameraActive(true);
    setCameraFacing(facing);

    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn("Unable to access camera directly, falling back to file picker:", err);
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    startCamera(nextFacing);
  };

  // Snap Photo from Live Camera
  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    haptics.heavy();
    setIsSending(true);

    try {
      const size = Math.min(video.videoWidth || 720, video.videoHeight || 720);
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const startX = ((video.videoWidth || 720) - size) / 2;
        const startY = ((video.videoHeight || 720) - size) / 2;

        // Mirror if front camera for natural selfie feel
        if (cameraFacing === "user") {
          ctx.translate(720, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, startX, startY, size, size, 0, 0, 720, 720);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsSending(false);
            return;
          }

          stopCamera();

          const messageId = crypto.randomUUID();
          const optimisticMsg: Message = {
            id: messageId,
            sender_id: activeUid,
            sender: activeUid,
            text: null,
            body: null,
            type: "polaroid",
            kind: "polaroid",
            media_path: "uploading",
            consumed: false,
            viewed_at: null,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => upsertMessage(prev, optimisticMsg));
          setTimeout(scrollToBottom, 50);

          try {
            const res = await sendMedia("polaroid", blob, "image/jpeg", undefined, messageId);
            if (res?.id) {
              room.send("chat", {
                id: res.id,
                sender: activeUid,
                sender_id: activeUid,
                kind: "polaroid",
                type: "polaroid",
                media_path: res.media_path,
                created_at: new Date().toISOString(),
              });
            }
          } catch (uploadErr) {
            console.warn("Failed to upload Polaroid:", uploadErr);
          } finally {
            setIsSending(false);
          }
        }, "image/jpeg", 0.88);
      }
    } catch (err) {
      console.warn("Failed to capture photo:", err);
      setIsSending(false);
      stopCamera();
    }
  };

  // Handle Photo Select from File Picker
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowPhotoOptions(false);
    setIsSending(true);
    haptics.medium();

    const messageId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: messageId,
      sender_id: activeUid,
      sender: activeUid,
      text: null,
      body: null,
      type: "polaroid",
      kind: "polaroid",
      media_path: "uploading",
      consumed: false,
      viewed_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => upsertMessage(prev, optimisticMsg));
    setTimeout(scrollToBottom, 50);

    try {
      const squareBlob = await toSquareJpeg(file, 720, 0.85);
      const res = await sendMedia("polaroid", squareBlob, "image/jpeg", undefined, messageId);
      if (res?.id) {
        room.send("chat", {
          id: res.id,
          sender: activeUid,
          sender_id: activeUid,
          kind: "polaroid",
          type: "polaroid",
          media_path: res.media_path,
          created_at: new Date().toISOString(),
        });
      }
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.warn("Failed to upload Polaroid:", err);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Consume & View Once Polaroid with Developing & Thanos Disintegration
  const handleConsumePolaroid = async (messageId: string) => {
    haptics.medium();
    setIsDevelopingLoading(true);

    try {
      const { url, error } = await consumeMedia(messageId);
      if (error || !url) {
        alert("This Polaroid has already vanished.");
        return;
      }

      // Mark consumed locally & broadcast to peer immediately
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, consumed: true, viewed_at: new Date().toISOString(), media_path: null }
            : m
        )
      );
      room.send("chat", {
        id: messageId,
        sender: activeUid,
        sender_id: activeUid,
        kind: "polaroid",
        type: "polaroid",
        consumed: true,
        viewed_at: new Date().toISOString(),
        media_path: null,
        created_at: new Date().toISOString(),
      });

      setDevelopedPolaroid({ url, messageId });
      setPolaroidTimeLeft(30);
      setIsPolaroidDisintegrating(false);
    } catch (err) {
      console.warn("Failed to consume Polaroid:", err);
    } finally {
      setIsDevelopingLoading(false);
    }
  };

  // Trigger Thanos snap disintegration for Polaroid
  const triggerPolaroidDisintegration = useCallback(() => {
    if (isPolaroidDisintegrating) return;
    haptics.heavy();
    setIsPolaroidDisintegrating(true);

    setTimeout(() => {
      if (developedPolaroid?.url) {
        URL.revokeObjectURL(developedPolaroid.url);
      }
      setDevelopedPolaroid(null);
      setIsPolaroidDisintegrating(false);
    }, 1300);
  }, [isPolaroidDisintegrating, developedPolaroid]);

  // Polaroid 30s Countdown Timer
  useEffect(() => {
    if (!developedPolaroid || isPolaroidDisintegrating) return;

    const timer = setInterval(() => {
      setPolaroidTimeLeft((prev) => {
        if (prev <= 1) {
          triggerPolaroidDisintegration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [developedPolaroid, isPolaroidDisintegrating, triggerPolaroidDisintegration]);

  // Start Audio Recording (Click to record)
  const startRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      haptics.medium();

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or unavailable:", err);
    }
  };

  // Cancel Audio Recording
  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    haptics.light();
  };

  // Stop & Send Audio Recording
  const finishAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    recorder.stream.getTracks().forEach((t) => t.stop());

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size > 200) {
        setIsSending(true);
        const messageId = crypto.randomUUID();
        const optimisticMsg: Message = {
          id: messageId,
          sender_id: activeUid,
          sender: activeUid,
          text: null,
          body: null,
          type: "voice",
          kind: "voice",
          media_path: "uploading",
          consumed: false,
          viewed_at: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => upsertMessage(prev, optimisticMsg));
        setTimeout(scrollToBottom, 50);

        try {
          const res = await sendMedia("voice", audioBlob, mimeType, undefined, messageId);
          if (res?.id) {
            room.send("chat", {
              id: res.id,
              sender: activeUid,
              sender_id: activeUid,
              kind: "voice",
              type: "voice",
              media_path: res.media_path,
              created_at: new Date().toISOString(),
            });
          }
          setTimeout(scrollToBottom, 100);
        } catch (err) {
          console.warn("Failed to send voice note:", err);
        } finally {
          setIsSending(false);
        }
      }
    };

    recorder.stop();
    haptics.heavy();
  };

  // Play Once Voice Note Overlay with Audio Visualizer & Countdown
  const handlePlayVoice = async (messageId: string) => {
    haptics.medium();

    try {
      const { url, error } = await consumeMedia(messageId);
      if (error || !url) {
        alert("This voice note has already vanished.");
        return;
      }

      // Mark consumed locally & broadcast
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, consumed: true, viewed_at: new Date().toISOString(), media_path: null }
            : m
        )
      );
      room.send("chat", {
        id: messageId,
        sender: activeUid,
        sender_id: activeUid,
        kind: "voice",
        type: "voice",
        consumed: true,
        viewed_at: new Date().toISOString(),
        media_path: null,
        created_at: new Date().toISOString(),
      });

      setActiveVoiceNote({ url, messageId });
      setIsVoiceDisintegrating(false);
      setVoiceTimeLeft(10); // Initial placeholder until audio metadata loads
    } catch (err) {
      console.warn("Failed to play voice note:", err);
    }
  };

  // Trigger Thanos snap disintegration for Voice Note
  const triggerVoiceDisintegration = useCallback(() => {
    if (isVoiceDisintegrating) return;
    haptics.heavy();
    setIsVoiceDisintegrating(true);

    setTimeout(() => {
      if (activeVoiceNote?.url) {
        URL.revokeObjectURL(activeVoiceNote.url);
      }
      setActiveVoiceNote(null);
      setIsVoiceDisintegrating(false);
    }, 1300);
  }, [isVoiceDisintegrating, activeVoiceNote]);

  // Audio Context & Frequency Analyser for Voice Playback
  useEffect(() => {
    if (!activeVoiceNote || isVoiceDisintegrating) return;

    const audio = new Audio(activeVoiceNote.url);
    audioElementRef.current = audio;

    let isCleanedUp = false;

    // Connect Web Audio API Analyser
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      audioSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        if (isCleanedUp) return;
        analyser.getByteFrequencyData(dataArray);

        // Normalize first 24 frequency bands into percentage heights (15% to 100%)
        const nextBars = Array.from({ length: 24 }, (_, i) => {
          const val = dataArray[i % bufferLength] || 0;
          return Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
        });
        setAudioBars(nextBars);

        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } catch (webAudioErr) {
      console.warn("Web Audio API not supported, using animated fallback:", webAudioErr);
      // Fallback dancing animation
      const fallbackTimer = setInterval(() => {
        if (isCleanedUp) return;
        const nextBars = Array.from({ length: 24 }, (_, i) =>
          Math.floor(20 + Math.sin(Date.now() / 150 + i) * 35 + Math.random() * 25)
        );
        setAudioBars(nextBars);
      }, 80);

      return () => clearInterval(fallbackTimer);
    }

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setVoiceTimeLeft(Math.ceil(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        const remaining = Math.max(0, Math.ceil(audio.duration - audio.currentTime));
        setVoiceTimeLeft(remaining);
      }
    };

    audio.onended = () => {
      triggerVoiceDisintegration();
    };

    audio.play().catch((playErr) => {
      console.warn("Audio play prevented:", playErr);
    });

    return () => {
      isCleanedUp = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audio.pause();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [activeVoiceNote, isVoiceDisintegrating, triggerVoiceDisintegration]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-cream dark:bg-mocha select-none ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBE7DF] dark:border-[#383530] bg-paper/90 dark:bg-obsidian/90 backdrop-blur-md safe">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center font-bold">
            ❤️
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
              Sanctuary Chat
            </h3>
            <span className="text-[10px] font-sans text-ink/50 dark:text-cream/50">
              Private • Cleared nightly at 00:00 IST
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-ink/60 dark:text-cream/60 hover:bg-sage/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ephemeral Notice Ribbon */}
      <div className="px-4 py-1.5 bg-sage/10 text-center border-b border-sage/20">
        <span className="text-[11px] font-sans text-sage dark:text-matcha flex items-center justify-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Single-thread ephemeral chat. Polaroids & voice vanish once viewed.</span>
        </span>
      </div>

      {/* Messages Scroll Feed */}
      <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-ink/40 dark:text-cream/40 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-sage/40" />
            <p className="font-serif text-sm">A quiet sanctuary waiting for you.</p>
            <p className="text-[11px] font-sans">
              Send a text, snap a quick Polaroid selfie, or record your voice.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe =
              m.sender === activeUid ||
              m.sender_id === activeUid ||
              (isCaptain
                ? m.sender === "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8" ||
                  m.sender_id === "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8"
                : m.sender === "a0ba3cb9-5397-498b-8740-5b9842381d15" ||
                  m.sender_id === "a0ba3cb9-5397-498b-8740-5b9842381d15");
            const isVanished = m.consumed || Boolean(m.viewed_at && !m.media_path);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* TEXT MESSAGE */}
                {m.kind === "text" || m.type === "text" ? (
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-sans whitespace-pre-wrap leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-sage text-cream rounded-br-sm"
                        : "bg-paper dark:bg-obsidian text-ink dark:text-cream border border-[#EBE7DF] dark:border-[#383530] rounded-bl-sm"
                    }`}
                  >
                    {m.body || m.text}
                  </div>
                ) : null}

                {/* POLAROID MESSAGE */}
                {m.kind === "polaroid" || m.type === "polaroid" ? (
                  <div className="max-w-[78%]">
                    {isVanished ? (
                      <div className="px-3.5 py-2 rounded-xl bg-paper/60 dark:bg-obsidian/40 border border-dashed border-[#DDD7CD] text-[11px] text-ink/40 dark:text-cream/40 italic flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Polaroid has vanished ✨</span>
                      </div>
                    ) : isMe ? (
                      <div className="p-3 rounded-2xl bg-sage/20 border border-sage/40 text-xs text-ink dark:text-cream flex items-center gap-2">
                        <Camera className="w-4 h-4 text-sage" />
                        <span>Polaroid sent · Waiting for view</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConsumePolaroid(m.id)}
                        disabled={isDevelopingLoading}
                        className="p-3.5 rounded-2xl bg-paper dark:bg-obsidian border-2 border-sakura/60 text-xs font-medium text-ink dark:text-cream flex items-center gap-2.5 shadow-sm active:scale-95 transition-all"
                      >
                        {isDevelopingLoading ? (
                          <Loader2 className="w-4 h-4 text-sakura animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-sakura animate-pulse" />
                        )}
                        <span>Tap to develop Polaroid (View Once) 📸</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* VOICE NOTE MESSAGE */}
                {m.kind === "voice" || m.type === "voice" ? (
                  <div className="max-w-[78%]">
                    {isVanished ? (
                      <div className="px-3.5 py-2 rounded-xl bg-paper/60 dark:bg-obsidian/40 border border-dashed border-[#DDD7CD] text-[11px] text-ink/40 italic flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Voice note played & vanished ✨</span>
                      </div>
                    ) : isMe ? (
                      <div className="p-3 rounded-2xl bg-sage/20 border border-sage/40 text-xs text-ink dark:text-cream flex items-center gap-2">
                        <Mic className="w-4 h-4 text-sage" />
                        <span>Voice note sent (Single play)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(m.id)}
                        className="px-4 py-2.5 rounded-2xl bg-paper dark:bg-obsidian border border-sage text-xs font-medium text-ink dark:text-cream flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 text-sage fill-current" />
                        <span>Play Voice Note (Once) 🎙️</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Timestamp & Status Indicator */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-ink/40 dark:text-cream/40">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span className="text-sage">
                      {m.viewed_at || m.consumed ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PHOTO SELECTION MODAL (Camera vs Gallery) */}
      <AnimatePresence>
        {showPhotoOptions && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-sm bg-paper dark:bg-obsidian rounded-3xl p-5 border border-[#EBE7DF] dark:border-[#383530] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EBE7DF] dark:border-[#383530] pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-sakura" />
                  <h4 className="font-serif font-semibold text-ink dark:text-cream">
                    Polaroid Selfie
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoOptions(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink/60 dark:text-cream/60 hover:bg-sage/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera("user")}
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-sage/10 hover:bg-sage/20 border border-sage/30 text-ink dark:text-cream transition-all active:scale-95"
                >
                  <div className="w-12 h-12 rounded-full bg-sage text-cream flex items-center justify-center shadow-md">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium">Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-sakura/10 hover:bg-sakura/20 border border-sakura/30 text-ink dark:text-cream transition-all active:scale-95"
                >
                  <div className="w-12 h-12 rounded-full bg-sakura text-mocha flex items-center justify-center shadow-md">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium">Photo Library</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIVE CAMERA VIEWFINDER MODAL */}
      <AnimatePresence>
        {isCameraActive && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm flex flex-col items-center space-y-4">
              {/* Header */}
              <div className="w-full flex items-center justify-between text-white px-2">
                <span className="text-xs font-serif tracking-wide text-white/80">
                  Polaroid Viewfinder
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Square Viewfinder */}
              <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black border-2 border-sakura/50 shadow-[0_0_35px_rgba(244,194,200,0.35)]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraFacing === "user" ? "-scale-x-100" : ""
                  }`}
                />
                {/* Framing crosshairs */}
                <div className="absolute inset-4 border border-white/20 rounded-2xl pointer-events-none" />
              </div>

              {/* Action Controls */}
              <div className="w-full flex items-center justify-around pt-2">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all"
                  aria-label="Flip camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={captureFromCamera}
                  disabled={isSending}
                  className="w-20 h-20 rounded-full bg-white p-1.5 shadow-2xl active:scale-90 transition-all"
                  aria-label="Capture photo"
                >
                  <div className="w-full h-full rounded-full bg-sakura border-4 border-white flex items-center justify-center">
                    {isSending ? (
                      <Loader2 className="w-6 h-6 text-mocha animate-spin" />
                    ) : (
                      <Camera className="w-7 h-7 text-mocha" />
                    )}
                  </div>
                </button>

                <div className="w-12 h-12" />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* POLAROID DEVELOPING OVERLAY (Tilted, Glowing, 30s Countdown & Thanos Disintegration) */}
      <AnimatePresence>
        {developedPolaroid && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative flex items-center justify-center w-full max-w-xs">
              {/* THANOS ASH PARTICLES */}
              {isPolaroidDisintegrating && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  {thanosParticles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{
                        x: p.startX,
                        y: p.startY,
                        opacity: 1,
                        scale: 1,
                        rotate: 0,
                      }}
                      animate={{
                        x: p.startX + p.driftX,
                        y: p.startY + p.driftY,
                        opacity: 0,
                        scale: 0,
                        rotate: p.rotate,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut",
                      }}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        borderRadius: "50%",
                        boxShadow: `0 0 8px ${p.color}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* POLAROID FRAME */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0, rotate: -2.5 }}
                animate={
                  isPolaroidDisintegrating
                    ? {
                        scale: 0.94,
                        opacity: 0,
                        rotate: -1,
                        filter: "blur(12px) brightness(1.3)",
                      }
                    : {
                        scale: 1,
                        opacity: 1,
                        rotate: -2.5,
                        filter: "blur(0px) brightness(1)",
                      }
                }
                transition={{
                  duration: isPolaroidDisintegrating ? 1.1 : 0.35,
                  ease: "easeOut",
                }}
                className="relative bg-[#FAFAF8] dark:bg-[#F2EFE9] text-[#2C2825] p-4 pb-7 rounded-xl shadow-[0_0_60px_rgba(244,194,200,0.65)] ring-2 ring-sakura/50 max-w-xs w-full text-center space-y-3"
              >
                {/* Close Button on Frame */}
                <button
                  type="button"
                  onClick={triggerPolaroidDisintegration}
                  disabled={isPolaroidDisintegrating}
                  className="absolute -top-3.5 -right-3.5 z-20 w-8 h-8 rounded-full bg-white dark:bg-mocha text-ink dark:text-cream shadow-lg border border-sakura/40 flex items-center justify-center active:scale-90 transition-all"
                  aria-label="Close and vanish"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 30-Second Countdown Badge */}
                <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow">
                  <span className="w-2 h-2 rounded-full bg-sakura animate-ping" />
                  <span>{polaroidTimeLeft}s remaining</span>
                </div>

                {/* Square Polaroid Photo with Developing Effect */}
                <div className="w-full aspect-square rounded overflow-hidden bg-black/10 relative shadow-inner">
                  <motion.img
                    src={developedPolaroid.url}
                    alt="Developed Polaroid"
                    initial={{
                      filter: "blur(14px) sepia(0.85) brightness(0.6)",
                      opacity: 0.3,
                    }}
                    animate={{
                      filter: "blur(0px) sepia(0) brightness(1)",
                      opacity: 1,
                    }}
                    transition={{ duration: 3.2, ease: "easeOut" }}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Bottom Caption */}
                <div className="pt-1 space-y-1">
                  <p className="font-serif italic text-xs text-[#4A453F] tracking-wide">
                    Single-view Polaroid ✨
                  </p>
                  <p className="text-[10px] text-[#7A7268] font-sans">
                    Vanishing forever in {polaroidTimeLeft} seconds
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* VOICE NOTE PLAYBACK OVERLAY (Glowing Center Card + Countdown + Reactive Frequency Bars + Thanos Snap) */}
      <AnimatePresence>
        {activeVoiceNote && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative flex items-center justify-center w-full max-w-xs">
              {/* THANOS ASH PARTICLES */}
              {isVoiceDisintegrating && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  {thanosParticles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{
                        x: p.startX,
                        y: p.startY,
                        opacity: 1,
                        scale: 1,
                        rotate: 0,
                      }}
                      animate={{
                        x: p.startX + p.driftX,
                        y: p.startY + p.driftY,
                        opacity: 0,
                        scale: 0,
                        rotate: p.rotate,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut",
                      }}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: p.color,
                        borderRadius: "50%",
                        boxShadow: `0 0 8px ${p.color}`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* GLOWING CENTER PLAYBACK CARD */}
              <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={
                  isVoiceDisintegrating
                    ? {
                        scale: 0.94,
                        opacity: 0,
                        filter: "blur(12px) brightness(1.3)",
                      }
                    : {
                        scale: 1,
                        opacity: 1,
                        filter: "blur(0px) brightness(1)",
                      }
                }
                transition={{
                  duration: isVoiceDisintegrating ? 1.1 : 0.3,
                  ease: "easeOut",
                }}
                className="relative w-full bg-paper dark:bg-obsidian border-2 border-sage/70 shadow-[0_0_55px_rgba(125,157,139,0.55)] rounded-3xl p-6 text-center space-y-5"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={triggerVoiceDisintegration}
                  disabled={isVoiceDisintegrating}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-sage/10 text-ink/70 dark:text-cream/70 hover:bg-sage/20 flex items-center justify-center active:scale-90 transition-all"
                  aria-label="Close voice note"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-sage">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                  <span className="font-serif font-medium text-sm text-ink dark:text-cream">
                    Voice Sanctuary
                  </span>
                </div>

                {/* Big Countdown Timer in the Middle */}
                <div className="space-y-1">
                  <div className="text-4xl font-mono font-bold text-sage tracking-wider">
                    00:{voiceTimeLeft < 10 ? `0${voiceTimeLeft}` : voiceTimeLeft}
                  </div>
                  <p className="text-[11px] font-sans text-ink/50 dark:text-cream/50">
                    Remaining play time · Single listen
                  </p>
                </div>

                {/* Real-Time Reactive Frequency Waveform Bars */}
                <div className="flex items-center justify-center gap-1.5 h-16 px-2 bg-sage/5 dark:bg-sage/10 rounded-2xl border border-sage/20">
                  {audioBars.map((heightPercent, idx) => (
                    <motion.div
                      key={idx}
                      className="w-1.5 rounded-full bg-gradient-to-t from-sage to-sakura transition-all duration-75"
                      style={{
                        height: `${heightPercent}%`,
                        opacity: Math.max(0.4, heightPercent / 100),
                      }}
                    />
                  ))}
                </div>

                <p className="text-[10px] font-sans text-ink/40 dark:text-cream/40 italic">
                  This voice will vanish forever upon finishing ✨
                </p>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM INPUT & ACTION BAR */}
      <div className="p-3 border-t border-[#EBE7DF] dark:border-[#383530] bg-paper dark:bg-obsidian safe">
        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* Dedicated Recording Bar when recording voice note */}
        {isRecording ? (
          <div className="flex items-center justify-between gap-3 px-2 py-1 bg-sakura/15 dark:bg-sakura/20 border border-sakura/40 rounded-2xl animate-fade-in">
            {/* Pulsing indicator + timer */}
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-sakura animate-ping" />
              <span className="text-xs font-mono font-bold text-ink dark:text-cream">
                0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
              <span className="text-[11px] font-sans text-ink/60 dark:text-cream/60">
                Recording voice...
              </span>
            </div>

            {/* Live pulsing mini bars */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1 bg-sakura rounded-full animate-pulse"
                  style={{
                    height: `${12 + (i % 3) * 6}px`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>

            {/* Cancel (Trash) & Send Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Discard recording"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-ink/60 dark:text-cream/60 hover:bg-black/10 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>

              <button
                type="button"
                onClick={finishAndSendRecording}
                aria-label="Send voice note"
                className="px-3.5 py-1.5 rounded-xl bg-sage text-cream text-xs font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Chat Input Row */
          <div className="flex items-center gap-2">
            {/* Camera / Polaroid Button */}
            <button
              type="button"
              onClick={() => setShowPhotoOptions(true)}
              aria-label="Capture Polaroid Selfie"
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5 text-sakura" />
            </button>

            {/* Text Input */}
            <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a loving note..."
                className="flex-1 h-11 px-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
              />

              {inputText.trim() ? (
                <button
                  type="submit"
                  disabled={isSending}
                  aria-label="Send message"
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-sage text-cream flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              ) : (
                /* Click to Record Voice Note */
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Record voice note"
                  className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95 transition-all"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
