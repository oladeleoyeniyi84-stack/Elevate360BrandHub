import creatorAvatar from "@/assets/creator/creator-avatar.png";
import clsx from "clsx";

type CreatorAvatarProps = {
  size?: "sm" | "md" | "lg";
  live?: boolean;
  speaking?: boolean;
  className?: string;
};

export function CreatorAvatar({
  size = "md",
  live = false,
  speaking = false,
  className,
}: CreatorAvatarProps) {
  const sizeClass =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-20 w-20" : "h-14 w-14";

  return (
    <div
      className={clsx(
        "relative flex-shrink-0 rounded-full p-[2px]",
        "bg-gradient-to-br from-[#F4A62A] via-[#D8A12F] to-[#2A2E4A]",
        live && !speaking && "e360-avatar-live",
        speaking && "e360-avatar-speaking",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-full bg-[#0B1020]">
        <img
          src={creatorAvatar}
          alt="Oladele — Elevate360 Founder Concierge"
          className={clsx(sizeClass, "rounded-full object-cover object-top")}
        />
      </div>
      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0B1020] bg-[#F4A62A]" />
    </div>
  );
}
