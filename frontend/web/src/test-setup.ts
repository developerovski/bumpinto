import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest `globals` kapalı olduğu için RTL kendi cleanup'ını kuramıyor:
// kurulmazsa render'lar birikir ve testler birbirinin DOM'unu görür.
afterEach(cleanup);
