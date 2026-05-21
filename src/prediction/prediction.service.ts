import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

// ─── Input / Output types ─────────────────────────────────────────────────

export interface PredictionInput {
  engine_size_l: number;
  cylinders: number;
  transmission: string;
  fuel_type: string;
  fuel_consumption_comb_l_per_100km: number;
  vehicle_type: string;
  liters_dispensed: number;
}

export interface PredictionOutput {
  /** Predicted fossil-fuel CO₂ emissions (g/km) — model output */
  co2_fossil_predicted_g_km: number;
  /** Known biofuel CO₂ value used for this event (g/km) */
  co2_biofuel_actual_g_km: number;
  /** co2_fossil_predicted − co2_biofuel_actual */
  co2_saved_g_km: number;
  /** Normalized inverse of fuel consumption — rewards efficient vehicles */
  efficiency_multiplier: number;
  /** Final points: co2_saved × efficiency_multiplier × liters × base_rate */
  points_awarded: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * PredictionService
 *
 * Communicates with the Python Random Forest model via child_process.
 * The Python script (scripts/predict.py) reads a JSON payload from stdin
 * and writes a JSON result to stdout.
 *
 * Protocol:
 *   stdin  → JSON string matching PredictionInput
 *   stdout → JSON string matching PredictionOutput
 *   stderr → any Python-side error messages (logged here)
 *   exit 0 → success  |  exit 1+ → failure
 */
@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  /** Absolute path to the Python prediction script. */
  private readonly scriptPath = path.resolve(
    process.cwd(),
    'scripts',
    'predict.py',
  );

  /**
   * Call the Python model with vehicle and fueling data.
   * Returns the full prediction output including points.
   */
  async predict(input: PredictionInput): Promise<PredictionOutput> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(input);

      const py = spawn('python3', [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      py.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      py.on('close', (code) => {
        if (stderr) {
          this.logger.warn(`[predict.py stderr] ${stderr.trim()}`);
        }

        if (code !== 0) {
          this.logger.error(
            `predict.py exited with code ${code}. stderr: ${stderr}`,
          );
          return reject(
            new InternalServerErrorException(
              'Prediction model failed. Check server logs.',
            ),
          );
        }

        try {
          const result: PredictionOutput = JSON.parse(stdout.trim());
          resolve(result);
        } catch {
          this.logger.error(
            `Failed to parse prediction output: "${stdout.trim()}"`,
          );
          reject(
            new InternalServerErrorException(
              'Invalid output from prediction model.',
            ),
          );
        }
      });

      py.on('error', (err) => {
        this.logger.error(`Failed to spawn python3: ${err.message}`);
        reject(
          new InternalServerErrorException(
            'Could not start prediction script. Ensure python3 is installed.',
          ),
        );
      });

      // Write the input payload to the Python script's stdin, then close it
      py.stdin.write(payload);
      py.stdin.end();
    });
  }
}
