"use client";

import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";
import SceneFrame from "./SceneFrame";
import DeviceFrame from "@/cinematic/components/realapp/DeviceFrame";
import RealCommunication from "@/cinematic/components/realapp/RealCommunication";
import { BroadcastViz } from "@/cinematic/components/fx/CinematicSide";

export default function ParentComm() {
  return (
    <Scene>
      <AuroraBackground intensity={0.5} />
      <StarField density={0.00009} speed={0.02} />

      <SceneFrame
        chapter="Chapter 02"
        number="02 / 05"
        headline="Every Parent. Always Connected."
        subline="Homework · Announcements · Circulars — delivered instantly"
      >
        <div className="absolute inset-0 grid grid-cols-2 items-center pt-16 pb-44 px-8 lg:px-16 gap-6">
          <div className="flex justify-end">
            <DeviceFrame
              width={560}
              aspect={0.66}
              windowTitle="Sanvi · Vidyalaya360 · Communication"
            >
              <RealCommunication />
            </DeviceFrame>
          </div>
          <div className="flex justify-start">
            <BroadcastViz />
          </div>
        </div>
      </SceneFrame>
    </Scene>
  );
}
