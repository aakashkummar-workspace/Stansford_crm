"use client";

import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import SceneFrame from "./SceneFrame";
import DeviceFrame from "@/cinematic/components/realapp/DeviceFrame";
import RealAttendance from "@/cinematic/components/realapp/RealAttendance";
import { FaceScanViz } from "@/cinematic/components/fx/CinematicSide";

export default function SmartAttendance() {
  return (
    <Scene>
      <AuroraBackground intensity={0.6} />
      <StarField density={0.0001} speed={0.025} />

      <SceneFrame
        chapter="Chapter 02"
        number="01 / 05"
        headline="Attendance. Instantly Connected."
        subline="Face recognition · Live sync · Parent alerts"
      >
        <div className="absolute inset-0 grid grid-cols-2 items-center pt-16 pb-44 px-8 lg:px-16 gap-6">
          {/* LEFT — real product on a device */}
          <div className="flex justify-end">
            <DeviceFrame
              width={560}
              aspect={0.66}
              windowTitle="Sanvi · Vidyalaya360 · Attendance"
            >
              <RealAttendance />
            </DeviceFrame>
          </div>
          {/* RIGHT — cinematic abstraction of what the screen represents */}
          <div className="flex justify-start">
            <FaceScanViz />
          </div>
        </div>
      </SceneFrame>
    </Scene>
  );
}
