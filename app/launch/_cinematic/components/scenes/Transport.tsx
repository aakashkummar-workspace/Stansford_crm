"use client";

import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";
import SceneFrame from "./SceneFrame";
import DeviceFrame from "@/cinematic/components/realapp/DeviceFrame";
import RealTransport from "@/cinematic/components/realapp/RealTransport";
import { RouteViz } from "@/cinematic/components/fx/CinematicSide";

export default function Transport() {
  return (
    <Scene>
      <AuroraBackground intensity={0.4} />
      <StarField density={0.00007} speed={0.02} />

      <SceneFrame
        chapter="Chapter 02"
        number="03 / 05"
        headline="Visibility Beyond Campus."
        subline="Live GPS · Pickup confirmations · Safety guaranteed"
      >
        <div className="absolute inset-0 grid grid-cols-2 items-center pt-16 pb-44 px-8 lg:px-16 gap-6">
          <div className="flex justify-end">
            <DeviceFrame
              width={560}
              aspect={0.66}
              windowTitle="Sanvi · Vidyalaya360 · Transport"
            >
              <RealTransport />
            </DeviceFrame>
          </div>
          <div className="flex justify-start">
            <RouteViz />
          </div>
        </div>
      </SceneFrame>
    </Scene>
  );
}
