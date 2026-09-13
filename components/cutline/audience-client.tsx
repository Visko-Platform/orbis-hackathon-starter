"use client";
import dynamic from "next/dynamic";

const Audience = dynamic(() => import("./audience"), { ssr: false });
export default Audience;
