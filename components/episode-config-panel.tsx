"use client";

import type { EpisodeDirector } from "@/hooks/use-episode-director";
import { DURATION_CHOICES, resolveObjects } from "@/lib/episode";
import { ROBOTS, getRobot } from "@/lib/robots";
import { TASKS, getTask } from "@/lib/tasks";
import { CAMERAS, ENVIRONMENTS } from "@/lib/scenes";

/**
 * Step 1 of the flow: choose the embodiment, then the task, then the scene.
 *
 * Tasks a robot cannot plausibly do are shown disabled rather than hidden, so
 * it stays obvious that the handover task needs two arms.
 */
export function EpisodeConfigPanel({ director }: { director: EpisodeDirector }) {
  const { config, updateConfig } = director;
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const locked = director.running || director.busy;
  const resolved = resolveObjects(config, task);
  const isCustom = task.id === "custom_task";

  const supports = (taskId: string) => {
    if (taskId === "custom_task") return true;
    const candidate = getTask(taskId);
    if (candidate.requires && !candidate.requires.includes(robot.class)) return false;
    return robot.skills.includes(taskId);
  };

  const chooseRobot = (id: string) => {
    const next = getRobot(id);
    const keepTask =
      config.taskId === "custom_task" || next.skills.includes(config.taskId);
    updateConfig({
      robotId: id,
      taskId: keepTask ? config.taskId : next.skills[0] ?? config.taskId,
    });
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <span className="step">1</span>
        <div>
          <h2>Embodiment and task</h2>
          <p>The robot conditions both the start frame and every steering prompt.</p>
        </div>
      </header>

      <div className="robot-grid">
        {ROBOTS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={locked}
            className={`robot-card${entry.id === config.robotId ? " selected" : ""}`}
            style={{ ["--accent" as string]: entry.accent }}
            onClick={() => chooseRobot(entry.id)}
          >
            <span className="robot-class">{entry.class}</span>
            <strong>{entry.name}</strong>
            <span className="robot-meta">{entry.dof}</span>
            <span className="robot-meta dim">{entry.gripper}</span>
          </button>
        ))}
      </div>

      <label className="field">
        Manipulation task
        <select
          value={config.taskId}
          disabled={locked}
          onChange={(event) => updateConfig({ taskId: event.target.value })}
        >
          {TASKS.map((entry) => (
            <option key={entry.id} value={entry.id} disabled={!supports(entry.id)}>
              {entry.name}
              {supports(entry.id) ? "" : ` — not available on this embodiment`}
            </option>
          ))}
        </select>
      </label>
      <p className="task-summary">
        <strong>{task.name}.</strong> {task.summary}
      </p>

      <fieldset className="acts-on" disabled={locked}>
        <legend>What the robot acts on</legend>
        <p className="hint">
          These drive the start frame, every steering prompt and the success
          cues. Leave them blank to use the task&apos;s defaults.
        </p>
        <div className="field-row">
          <label className="field">
            Object to interact with
            <input
              type="text"
              value={config.objectOverride}
              placeholder={task.object}
              onChange={(event) =>
                updateConfig({ objectOverride: event.target.value })
              }
            />
          </label>
          <label className="field">
            Target / destination
            <input
              type="text"
              value={config.targetOverride}
              placeholder={task.target}
              onChange={(event) =>
                updateConfig({ targetOverride: event.target.value })
              }
            />
          </label>
        </div>
        <label className="field">
          Instruction — what the robot should do
          {isCustom && <span className="required"> required for a custom task</span>}
          <input
            type="text"
            value={config.instructionOverride}
            placeholder={resolved.instruction}
            onChange={(event) =>
              updateConfig({ instructionOverride: event.target.value })
            }
          />
        </label>
        <p className="resolved">
          Resolved: <code>{resolved.instruction}</code>
        </p>
      </fieldset>

      <div className="field-row">
        <label className="field">
          Environment
          <select
            value={config.environmentId}
            disabled={locked}
            onChange={(event) => updateConfig({ environmentId: event.target.value })}
          >
            {ENVIRONMENTS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Camera rig
          <select
            value={config.cameraId}
            disabled={locked}
            onChange={(event) => updateConfig({ cameraId: event.target.value })}
          >
            {CAMERAS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          Episode length
          <select
            value={config.durationSeconds}
            disabled={locked}
            onChange={(event) =>
              updateConfig({ durationSeconds: Number(event.target.value) })
            }
          >
            {DURATION_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value} s
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Seed
          <input
            type="number"
            value={config.seed}
            disabled={locked}
            min={0}
            onChange={(event) =>
              updateConfig({ seed: Number(event.target.value) || 0 })
            }
          />
        </label>
        <label className="field">
          Delivery resolution
          <select
            value={config.resolution}
            disabled={locked}
            onChange={(event) => updateConfig({ resolution: event.target.value })}
          >
            <option value="">Model default</option>
            {director.availableResolutions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={config.randomize}
          disabled={locked}
          onChange={(event) => updateConfig({ randomize: event.target.checked })}
        />
        <span>
          Domain randomization — vary lighting, surface finish, clutter and
          palette from the seed, keeping the robot and task fixed
        </span>
      </label>

      <label className="field">
        Scene notes (optional)
        <textarea
          rows={2}
          value={config.notes}
          disabled={locked}
          placeholder="e.g. add a second smaller cube behind the bin, cool blue lighting"
          onChange={(event) => updateConfig({ notes: event.target.value })}
        />
      </label>
    </section>
  );
}
