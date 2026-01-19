import { useMemo } from 'react';
import { SimulationParams, SimulationResponse } from '../types';

export const useSimulationEngine = (
  modelId: string, 
  params: SimulationParams,
  options: { precision: number } = { precision: 4 }
): SimulationResponse => {
  return useMemo(() => {
    // Simulate Backend API Latency/Processing
    // In a real app, this would be an async fetch
    
    const { theta, distance } = params;
    
    // 1. Validation Layer
    const warnings: string[] = [];
    let safeTheta = theta;

    if (theta < 0) {
      safeTheta = 0;
      warnings.push("Angle cannot be negative. Clamped to 0.");
    } else if (theta > 90) {
      safeTheta = 90;
      warnings.push("Angle cannot exceed 90°. Clamped to 90.");
    }

    // 2. Edge Case Handling (Strict Rules)
    // tan(90) -> Undefined
    if (Math.abs(safeTheta - 90) < 0.01) {
      return {
        status: 'ok', // It's a valid calculation result, just a special one
        outputs: null,
        equations: ["height = distance * tan(90°)"],
        warnings: ["Tan 90° is undefined. The lines are parallel."],
        explanation: "At 90°, the line of sight is vertical and never meets the ground plane relative to the base. The height approaches infinity."
      };
    }

    // 3. Deterministic Math Core
    const rad = (safeTheta * Math.PI) / 180;
    const tanVal = Math.tan(rad);
    const height = distance * tanVal;
    const hypotenuse = distance / Math.cos(rad);

    // 4. Output Formatting
    return {
      status: 'ok',
      outputs: {
        height: parseFloat(height.toFixed(options.precision)),
        distance: parseFloat(distance.toFixed(options.precision)),
        hypotenuse: parseFloat(hypotenuse.toFixed(options.precision))
      },
      ratios: {
        sin: parseFloat(Math.sin(rad).toFixed(options.precision)),
        cos: parseFloat(Math.cos(rad).toFixed(options.precision)),
        tan: parseFloat(tanVal.toFixed(options.precision))
      },
      equations: [
        `h = ${distance} × tan(${safeTheta}°)`,
        `h = ${distance} × ${tanVal.toFixed(2)}`
      ],
      warnings
    };
  }, [modelId, params.theta, params.distance, options.precision]);
};