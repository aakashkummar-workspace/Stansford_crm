"use client";

import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";
import SceneFrame from "./SceneFrame";
import DeviceFrame from "@/cinematic/components/realapp/DeviceFrame";
import RealDashboard from "@/cinematic/components/realapp/RealDashboard";
import { ConstellationViz } from "@/cinematic/components/fx/CinematicSide";

export default function TrustDashboard() {
  return (
    <Scene>
      <AuroraBackground intensity={0.5} />
      <StarField density={0.00009} speed={0.02} />

      <SceneFrame
        chapter="Chapter 02"
        number="04 / 05"
        headline="Leadership Through Transparency."
        subline="One pane of glass — students, fees, attendance, transport"
      >
        <div className="absolute inset-0 grid grid-cols-2 items-center pt-16 pb-44 px-8 lg:px-16 gap-6">
          <div className="flex justify-end">
            <DeviceFrame
              width={580}
              aspect={0.66}
              windowTitle="Sanvi · Vidyalaya360 · Dashboard"
            >
              <RealDashboard />
            </DeviceFrame>
          </div>
          <div className="flex justify-start">
            <ConstellationViz />
          </div>
        </div>
      </SceneFrame>
    </Scene>
  );
}
