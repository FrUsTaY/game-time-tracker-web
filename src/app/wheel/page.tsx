import type { Metadata } from "next";
import { WheelView } from "@/components/wheel-view";

export const metadata: Metadata = {
  title: "Колесо выбора — GameBacklogs",
  description: "Рулетка для выбора следующей игры из бэклога",
};

export default function WheelPage() {
  return <WheelView />;
}
