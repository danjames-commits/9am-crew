# Fringe Sport / MuscleDriver “No Limits” Gym Timer
## Complete Remote-Control Operating Manual

**Version:** 1.0, 22 October 2026  
**Applies to:** The photographed black **FRINGE SPORT** remote with red **Power**, blue **Set**, a telephone-style numeric pad, `*` and `#`, blue four-direction arrows surrounding **OK**, **Exit**, **Pause**, **Restart**, **Select**, and **F1–F12**. The corresponding wall clock has blue characters on the left and red time digits on the right.

**Purpose:** A self-contained description of the remote's controls, workout modes, time entry, setup, stored programs, display conventions, and alternate behaviours documented for closely related timer versions. The instructions can be interpreted as ordered button presses by any operator, including software controlling an IR transmitter.

**Documentation notation**

- `KEY → KEY` means press the listed keys in order; it does **not** mean hold the keys simultaneously.
- `UP`, `DOWN`, `LEFT`, `RIGHT` designate the **four blue arrow buttons** surrounding `OK`. These are distinct from the preset count-up / countdown values.
- `SET` = the blue circular button near the remote's top-right; `POWER` = the red circular button near the top-left.
- `SELECT` = the grey button at the right below the navigation circle. `EXIT`, `PAUSE` and `RESTART` are the three other grey buttons in that area.
- `F1` … `F12` are the grey buttons in the lower four rows.
- Display examples use normalized representations such as `dn 3:00`, `UP 1:00`, `F2 20:00`, `01H 0:20`. Actual seven-segment character shapes and leading zeros may differ.
- **[Direct]** means a procedure or behavior appears in the original MuscleDriver *No Limits* manual.
- **[Related]** means described in the Sport-Thieme seven-digit interval timer manual for a closely related, but not guaranteed identical, controller.
- **[Photo]** means the physical key or label is present on the photographed remote.
- **[Unresolved]** means manuals conflict or do not document how this exact remote version behaves. Alternatives are given without choosing an unproven option.

---

## 1. Physical remote: complete button inventory

| Key | Physical label / placement | Documented or possible action |
|---|---|---|
| `POWER` | Red circle, top left | Switch the display on/off; related manual says only from clock mode. [Related] |
| `SET` | Blue circle, top right | Set/configuration function. Exact behavior, particularly its relationship to 12/24-hour mode, is undocumented for this remote. [Photo] [Unresolved] |
| `0`–`9` | Number keypad | Enter numeric values, custom minutes/seconds, and number of rounds. [Direct] [Related] |
| `*` | Bottom-left numeric-pad symbol | Function not identified in the original or related timer manuals. Possible special/adjustment key only, not confirmed. [Photo] [Unresolved] |
| `#` | Bottom-right numeric-pad symbol | Function not identified in the original or related timer manuals. Possible special/adjustment key only, not confirmed. [Photo] [Unresolved] |
| `UP` `↑` | Blue up arrow above `OK` | Enter custom **count-up-to** timer mode. [Direct] |
| `DOWN` `↓` | Blue down arrow below `OK` | Enter custom **countdown-from** timer mode. [Direct] |
| `LEFT` `←` | Blue left arrow | Select the **minutes** field in timer programming; select **hours** when setting the clock. [Direct] [Related] |
| `RIGHT` `→` | Blue right arrow | Select **seconds** in timer programming; select **minutes** when setting the clock. [Direct] [Related] |
| `OK` | Blue central button | Confirm a value or start a selected timer; after Pause, normally resumes a stopped countdown. [Direct] [Related] |
| `EXIT` | Grey button, below navigation on left | Leave a running/paused program and return to clock/mode selection. [Direct] [Related] |
| `PAUSE` | Grey button under the `Pause` label | Stop/pause timing. [Related]; the function is identified on the photographed remote. |
| `RESTART` | Grey button under the `Restart` label | Restart a workout from its initial setting (related manual's exact sequence is ambiguous). [Related] [Unresolved] |
| `SELECT` | Grey button under the `Select` label | Enter/program repeated work/rest intervals and advance through **round count → work time → rest time**. [Direct] |
| `F1` | Label `100min UP` | Fixed count-up, approximately 0:00 to 99:59 / 100 minutes. [Direct] [Photo] |
| `F2` | Label `20min DN` | Fixed 20-minute countdown from 20:00 to 0:00. [Direct] [Photo] |
| `F3` | Label `FGB` | Built-in Fight Gone Bad, 17 total one-minute stages. [Direct] [Photo] |
| `F4` | Label `stopwatch` | Count-up stopwatch with hundredths-of-a-second resolution. [Direct] [Photo] |
| `F5` | Label `TABATA` | Built-in eight rounds of 20 seconds work + 10 seconds rest. [Related] [Photo] |
| `F6` | Lower keypad row | Saved custom workout slot on related firmware. [Related] |
| `F7` | Lower keypad row | Saved custom workout slot on related firmware. [Related] |
| `F8` | Lower keypad row | Saved custom workout slot on related firmware. [Related] |
| `F9` | Lower keypad row | Saved custom workout slot on related firmware. [Related] |
| `F10` | Lower keypad row | Saved custom workout slot on related firmware. [Related] |
| `F11` | Lower keypad row | Audio/beeper toggle on related firmware; original MuscleDriver manual instead includes F11 among saveable custom slots. [Related] [Direct] [Unresolved] |
| `F12` | Lower keypad row | Ten-second prep-countdown toggle on related firmware; original MuscleDriver manual instead includes F12 among saveable custom slots. [Related] [Direct] [Unresolved] |

**Important distinction:** The `UP` and `DOWN` arrow buttons select *timer modes*. They are **not confirmed equivalents** of the `+` / `−` keys mentioned in the older MuscleDriver instructions. That original manual refers to `+` and `−` even though neither symbol appears as a dedicated button on the photographed remote. The related timer manual explicitly supports the numeric keys `0`–`9` for editing values.

---

## 2. Overall operating model

**Clock mode:** The default idle view is normally the current time of day. The original MuscleDriver documentation depicts an idle clock such as `22:00`.

**Choose a program:** Press a fixed-function `F` key, the `UP` or `DOWN` arrow, or `SELECT` to enter a workout programming/preview state. For many modes, `OK` starts that mode. If a previous workout is active, `EXIT` may be needed before a new mode selection. [Direct] [Related]

**Typical countdown start:** For the original No Limits firmware, workout modes normally begin with a **10-second preparation countdown**, then begin measuring workout time. The related firmware permits this preparation to be enabled/disabled using `F12`, if that mapping is supported on the particular unit.

**Time ranges:** Normal programmed workout time is `00:00` to `99:59` (minutes:seconds). `F1` and `F4` reach approximately 100 minutes. Custom interval rounds range from **1 to 99**, according to the original instructions. [Direct] [Related]

**Beep signalling:** Countdown or work/rest transitions are accompanied by audible beeps unless the unit's supported mute setting is active. Details differ by mode and timer revision.

---

## 3. Entering numerical times

### 3.1 Time is programmed in separate minute and second fields

In a custom count-up, countdown, or work/rest configuration:

1. Use `LEFT` to choose **minutes** (the selected digits blink).
2. Use the numeric keys to enter the desired number of minutes.
3. Use `RIGHT` to choose **seconds** (the selected digits blink).
4. Use the numeric keys to enter seconds if required.
5. Use `OK` to start, or an eligible memory `F` key to save the configuration.

The timer's displayed programming format is `MM:SS`, though leading zeros may be suppressed on-screen. The related manual includes these examples: custom count-up `UP 0:00 → UP 1:00`; custom countdown `dn 0:00 → dn 5:00`.

### 3.2 A three-minute countdown

**Mode selection and field selection:** `EXIT` (if necessary) → `DOWN` → `LEFT` → *enter minutes equal to 3* → `RIGHT` → *enter seconds equal to 0, if needed* → `OK`.

**Unresolved number-key detail:** Whether the minute field accepts **`3`** directly, **requires `0 → 3`**, or accepts both is **not specified** by either authoritative manual. The four-digit combined entry strings `300` and `0300` are not the documented primary method because the manuals explicitly separate minutes from seconds.

Alternative accepted minute-field entries to distinguish on this hardware:

- **Candidate A:** `LEFT → 3` produces 3 minutes directly (display may show `3:00` or `03:00`).
- **Candidate B:** `LEFT → 0 → 3` produces 3 minutes with a two-key field entry.
- **Candidate C:** `LEFT → 3 → 0` might be interpreted as 30 minutes if the field uses sequential two-digit entry, not a three-minute value.

**Unresolved zero entry:** Numeric `0 → 0` versus a single `0` versus leaving the existing seconds at `00` is likewise not explicitly distinguished in the manuals.

**Unresolved edit style:** The related timer manual documents digit entry but not whether a new digit replaces an entire field, shifts into a field, appends to a two-digit buffer, or increments a blinking digit. The original manual also mentions `+` / `−` entry without defining corresponding keys on this replacement remote.

### 3.3 Possible alternative `+` and `−` mappings

The MuscleDriver instructions allow `+` and `−` for changing blinking values, and specifically mention number keys *or* `+`/`−` for the countdown. The photographed remote instead contains `*`, `#`, a blue `SET`, and arrows.

- **Documented:** Numeric `0`–`9` input works on the related remote's programming screens; numeric input is permitted for custom countdown in the original manual.
- **Not documented:** `*` as minus, `#` as plus, or the reverse.
- **Not documented:** `UP` / `DOWN` as numeric increments when already editing a blinking field.
- **Not documented:** Whether `SET` changes edit mode to incremental adjustment.

No such mapping is asserted as fact here.

---

## 4. Preset workouts and simple timer operations

### 4.1 `F1`: 100-minute count-up

**Sequence:** `EXIT` (if in another program) → `F1` → `OK`.

- Preview typically shows `F1 00:00` or `F1 100` depending on firmware.
- Original No Limits manual: 10-second prep countdown followed by counting upward from `0:00` to `99:59`.
- Related manual: describes an endpoint labelled `F1 100` with a roughly three-second end alarm.
- No custom duration is entered for this preset. For a shorter count-up target, use `UP` mode.

### 4.2 `F2`: fixed 20-minute countdown

**Sequence:** `EXIT` (if needed) → `F2` → `OK`.

- Preview: `F2 20:00`.
- Original No Limits manual: 10-second preparation countdown, then count down from `20:00` to `00:00`.
- Related manual: three-second end alarm; final display `F2 0:00`.
- This duration is fixed. To set three, five or other minutes, use `DOWN` instead.

### 4.3 `F3`: Fight Gone Bad (FGB)

**Sequence:** `EXIT` (if needed) → `F3` → `OK` **on related firmware**.

- Preview: `F3 17:00`.
- Built-in sequence: **17 consecutive one-minute stages** (17 minutes in total), designed for a Fight Gone Bad workout.
- Original No Limits manual describes a 10-second lead-in followed by automatic stage transitions.
- Original manual: **one beep** on entry into each new movement and **two beeps** for rest intervals.
- Related manual: blue portion shows a sequential stage index `01` … `17`; red portion counts down the minute; around the end of the seventeenth minute an endpoint alarm sounds.
- **Version ambiguity:** The original No Limits PDF says “Press F3” and does **not** explicitly say “then OK,” whereas the related manual does. Therefore the timer may start after `F3` alone on some versions, or require `F3 → OK` on others.
- **FGB stage mapping:** Standard Fight Gone Bad commonly comprises three five-minute work blocks with a one-minute rest after each block, producing 18 minutes if the final rest is included, or 17 minutes if only the two between-round rest minutes are included. Both manuals specify **17 minutes** for this clock's preset. The exact workout movements are not encoded in the timer; audible changes occur at one-minute boundaries.

### 4.4 `F4`: stopwatch, hundredths-of-a-second display

**Sequence:** `EXIT` (if needed) → `F4` → `OK`.

- Preview shows `F4`.
- Stopwatch starts **immediately** at `00:00:00` (minutes:seconds:hundredths), without the regular ten-second lead-in according to the original No Limits manual.
- Runs upward for approximately 100 minutes (`99:59` plus hundredths).
- Related manual documents a terminal alarm at the approximately 100-minute mark.
- Intended for measuring elapsed time, not setting a target duration.

### 4.5 `F5`: Tabata

**Sequence:** `EXIT` (if needed) → `F5` → `OK` [Related].

- The pictured remote explicitly prints **TABATA** beside `F5`.
- Eight cycles of **20 seconds of work (`H`)** and **10 seconds of rest (`P`)**.
- Total programmed exercise/rest time: **4:00** (8 × 30 seconds), plus the optional 10-second initial preparation period.
- Preview on the related timer: `F5 4:00`.
- Working phase displays such as `01H 0:20`; rest phase such as `01P 0:10`; final period `08P 0:00`.
- Related manual describes two beeps after a work segment, a single beep around the final three seconds of each rest segment, and an alarm at completion.
- The fixed eight-round Tabata is distinct from a *custom* work/rest schedule created with `SELECT`.

---

## 5. Custom one-shot timers

### 5.1 Custom countdown `DOWN`

**General sequence:** `EXIT` (if necessary) → `DOWN` → `LEFT` → minute digits → `RIGHT` → second digits → `OK`.

- Preview: `dn 00:00` or `dn 0:00`.
- Select minutes with `LEFT`, seconds with `RIGHT`. Blinking denotes the field being modified.
- Values range from `00:00` to `99:59`.
- Starts at chosen countdown duration and runs down to `00:00`, preceded by a 10-second preparation countdown on original firmware (if enabled on a related version).
- Related manual example for 5:00: `dn 5:00`, then countdown at `dn 4:59`, terminal `dn 0:00`.
- Related manual reports an end alarm lasting about three seconds; any key may silence it.
- Instead of `OK`, use a suitable programmable function key to **save**, as described in Section 7.

### 5.2 Custom count-up `UP`

**General sequence:** `EXIT` (if necessary) → `UP` → `LEFT` → target minutes → `RIGHT` → target seconds → `OK`.

- Preview: `UP 00:00` or `UP 0:00`.
- Select minutes with `LEFT`, seconds with `RIGHT`.
- Programmable target range `00:00` to `99:59`.
- Timer begins at `00:00` and counts **up to the selected target**; it is not a countdown.
- Original manual: ten-second initial preparation countdown.
- Related manual describes a completion alarm and retention of the previous target when the mode is reopened/restarted.
- Example: set `UP 1:00` to measure a one-minute upward-running session.
- Save instead of starting using a programmable function key (Section 7).

---

## 6. Custom repeated work/rest intervals (`SELECT`)

The `SELECT` button builds an alternating two-phase interval program with a fixed round count. The original No Limits manual refers to the phases as **H1** (work) and **H2** (rest). The related manual shows them as **H** and **P** respectively. Both refer to the same high-level concept.

### 6.1 Program sequence

1. `EXIT` if a different timer mode is active.
2. Press `SELECT` to enter custom intervals. The clock displays a **round count** in blue.
3. Enter the total number of rounds using the numeric keys `0`–`9`. Documented range: **1 to 99**.
4. Press `SELECT` again to enter the **work** duration. Original No Limits display example: `H1 20:08`; related display: `H 10:00`.
5. Use `LEFT` to choose work minutes and `RIGHT` to choose work seconds. Enter the desired numbers.
6. Press `SELECT` again to enter the **rest** duration. Original No Limits display example: `H2 02:08`; related display: `P 20:00`.
7. Use `LEFT` for rest minutes and `RIGHT` for rest seconds. Enter the desired numbers.
8. Press `OK` to run the configured interval program. **Alternatively**, press a programmable function key to save it.

**Pseudosequence:** `SELECT → rounds → SELECT → LEFT → work_MM → RIGHT → work_SS → SELECT → LEFT → rest_MM → RIGHT → rest_SS → OK`.

`work_MM`, `work_SS`, `rest_MM`, and `rest_SS` are **field values**, not definite one-digit or two-digit key strings; consult the unresolved field-entry possibilities in Section 3.

### 6.2 Execution and display

- A preparation countdown precedes the first work round on the original No Limits firmware.
- Each round is **work, then rest**, repeated for the programmed count.
- Related manual shows blue stage/round indicators such as `01H`, `01P`, `02H`, and `12P`; the red digits show remaining duration for the active phase.
- Original No Limits manual: **one beep** at the start of each work phase; **two beeps** at the start of each rest phase.
- Related manual: two-tone indication after the work timer expires, beeps at the end of the rest period, and a three-second completion alarm.
- When the final round ends, the related manual leaves the final stage displayed and preserves prior interval settings for reuse.

### 6.3 Numeric example: 12 rounds of 1:00 work / 0:30 rest

The intended values are:

- Rounds = `12`
- Work = `01:00`
- Rest = `00:30`

**Selection sequence:** `SELECT → [12 rounds] → SELECT → [01:00 work] → SELECT → [00:30 rest] → OK`.

The notation `[01:00 work]` represents setting minutes and seconds with `LEFT` and `RIGHT` and numeric input. How many keypresses are needed for leading zeroes is firmware-dependent and undocumented.

### 6.4 Additional possible interval behaviour [Related]

On the related seven-digit timer, during a Tabata or custom interval workout, `LEFT` or `RIGHT` can enter a temporary *query* showing the stored round count/current round and work/rest durations, such as `12` / `C05`, `H 10:00`, or `P 20:00`. It may automatically return to timing mode. This runtime key behavior is not described in the original No Limits PDF.

There is no documentation for a third phase, a warm-up interval of arbitrary length, different work/rest durations per round, or an indefinite/open-ended round count in these sources.

---

## 7. Saved custom programs (`F` keys)

### 7.1 Save

After entering a complete custom `UP`, `DOWN`, or `SELECT` configuration, **press a supported programmable function key instead of `OK`**. The original No Limits manual states that the unit **beeps three times** to acknowledge the save and returns to clock mode.

### 7.2 Load and run

**Sequence:** `EXIT` (if needed) → `saved F-key` → `OK`.

The saved `F` key retrieves that program and `OK` begins it. The related manual says saving to an occupied slot **overwrites** its earlier contents.

### 7.3 Which keys are memory slots? Two documented firmware variants

| Feature | Original MuscleDriver No Limits manual | Related Sport-Thieme seven-digit timer |
|---|---|---|
| Custom memory keys | **F5–F12** (eight slots) | **F6–F10** (five slots) |
| F5 | Original manual includes it as a save slot | Dedicated **Tabata** |
| F11 | Original manual includes it as a save slot | **Audio on/off** |
| F12 | Original manual includes it as a save slot | **10-second prep on/off** |
| Overwrite | Not explicitly described | Saving replaces previous contents |
| Save feedback | Three beeps, then clock | Three beeps, then clock |

The **photographed remote has `TABATA` printed above F5**, strongly indicating the later **F6–F10** slot arrangement; however, its timer may still be an older MuscleDriver unit using a compatible replacement remote. **Do not assume its firmware interprets every F key according to the remote's printed label.** Both arrangements are genuine documented versions.

`F6`–`F10` are the overlap between the two manuals and thus the **best-documented five candidate memory keys**. `F5`, `F11`, and `F12` are version-dependent and may execute preset/toggle functions rather than memory operations.

### 7.4 Persistence unknowns

Neither cited manual establishes whether saved programs survive power removal, whether there is a factory-reset command, or whether memory survives battery/AC replacement. The memory system is documented as reusable, but nonvolatile persistence is not guaranteed by these sources.

---

## 8. Running program controls

### 8.1 `OK`: start and resume

- **From a preview/programming screen:** Press `OK` to start the selected timer. [Direct] [Related]
- **After `PAUSE`:** Related manual explicitly says `OK` continues/resumes. [Related]
- **At completion:** Depending on firmware, `OK` may restart a previous workout; the exact completed-state behavior is not separately explained.

### 8.2 `PAUSE`: suspend timer

**Sequence:** `PAUSE` during a timer run.

- Related timer manual: stops the currently running countdown or count-up at the present value.
- **To continue:** `OK` on related firmware.
- Whether another `PAUSE` press also resumes is not documented.
- A Fringe Sport replacement-remote owner reports that Pause/Restart buttons do not work properly with their older MuscleDriver clock. Thus control and host compatibility vary across generations.

### 8.3 `RESTART`: begin the existing workout again

**Documented but grammatically ambiguous in the related manual:** “At time pause or stop state, press [Restart] key to start again, press [OK] key to restart time.”

Two plausible interpretations:

- **Variant A:** `RESTART` resets the present workout to its starting value, then `OK` begins it from the start.
- **Variant B:** `RESTART` both resets **and immediately runs** the present workout, with `OK` also usable as a subsequent start/confirmation.

On the photographed replacement remote, Pause/Restart host compatibility is not certain. Neither source proves which of Variant A or B applies to this exact timer.

**Restart is not identical to Pause:** `PAUSE → OK` is documented as **resumption at the paused value**; `RESTART` is documented as **starting the workout over**, although precise timing of the start is unsettled.

### 8.4 `EXIT`: leave a mode

**Sequence:** `EXIT` while timing or paused.

Related manual states that this exits the current timer/mode. Original No Limits manual repeatedly says `EXIT` may be needed before selecting a different program. Normal next state is the clock display or timer-selection state.

### 8.5 Power

- `POWER`: toggles the timer display on/off according to the related seven-digit timer manual.
- On that version the power button is operational only when the clock is showing, not during an active workout mode.
- This is a display/remote power function; it is not described as physically disconnecting the AC adapter.

---

## 9. Clock, 12/24-hour format, and setting time of day

### 9.1 Display clock time

The idle mode is a time-of-day clock. The original No Limits manual illustrates a clock view with red hour and minute digits (`22:00`). The related seven-digit timer can also show seconds and `A` / `P` indicators for AM/PM. Seven-segment layouts and formats vary by revision.

### 9.2 Set clock time

**Procedure common to the manuals:**

1. Be in clock mode.
2. `LEFT` selects the **hours** field.
3. Enter/change the hour value.
4. `RIGHT` selects the **minutes** field.
5. Enter/change the minute value.
6. Press `OK` to confirm.

**Two input systems are documented:**

- Original No Limits PDF specifies changing blinking clock values with physical keys called **`+` and `−`**. It does not establish how those correspond to the buttons on the photographed remote.
- Related seven-digit manual specifies **numeric `0`–`9`** entry into selected fields.

Hour formatting is 12-hour or 24-hour depending on settings. The exact number-key sequence for leading-zero clock hours and minutes is not documented.

### 9.3 Change 12/24-hour format

- Original No Limits PDF documents a control named **`12/24`**, showing 12- or 24-hour mode on the display.
- Related seven-digit manual documents **`12/24H`**, producing transient displays `12 Hour` and `24 Hour` and returning automatically to clock mode. In 12-hour format its clock shows `A` for AM or `P` for PM.
- **Physical mismatch:** The photographed Fringe Sport remote has no button visibly labelled `12/24` or `12/24H`.
- **Unresolved candidates:** Its blue `SET` button, `*`, `#`, or a multi-button command could implement this feature, or the compatible host may simply not expose it through this remote. No specific mapping is established by the sources.

---

## 10. Audio and initial preparation countdown

### 10.1 Initial ten-second preparation

- Original MuscleDriver manual: standard count-up, countdown, custom interval and FGB workouts start with a **10-second prep countdown**; stopwatch `F4` starts immediately.
- Related seven-digit timer: **`F12` toggles the 10-second preparation interval**. It briefly displays `10 -- on` for enabled and `10 -OFF` for disabled. With prep enabled, the unit counts down ten seconds before the chosen workout and beeps for the last three seconds.
- **Conflict:** On original No Limits firmware, `F12` is described as a *saveable custom program* key. Therefore `F12` can mean **memory slot** rather than **prep toggle**.

### 10.2 Audio on/off

- Related timer: from clock mode, press **`F11`** to toggle audible alerts, showing `AL--on` or `AL-OFF`.
- The related manual notes that some keypress feedback tones may still sound even with workout alerts disabled.
- Original No Limits PDF contains beep descriptions but **does not document an audio-toggle button** and instead treats `F11` as a possible saved program key.

### 10.3 Beep meanings by mode

| Situation | Beep behavior described |
|---|---|
| Saving a custom program | **Three beeps** in both manuals. |
| Standard original 10-second prep countdown | Beeps are associated with the start; related manual specifies the final three seconds. |
| Custom interval work begins | **One beep** in the original manual. |
| Custom interval rest begins | **Two beeps** in the original manual. |
| FGB movement transition | **One beep** in the original manual. |
| FGB rest transition | **Two beeps** in the original manual. |
| Fixed/personal timer finishes | Related manual: roughly **three-second alarm**. |
| Tabata work-to-rest transition | Related manual: two-tone alert. |
| Tabata rest ending | Related manual: audible notice near final three seconds. |
| Muted state | Related manual: workout alarms disabled, some key beeps possibly remain. |

---

## 11. Display legend

| Display pattern | Meaning / context |
|---|---|
| `22:00` (red) | Clock time; illustrated by original No Limits manual. |
| `12 ...` / `24 ...` | Clock display format setting; manual-specific. |
| `F1 00:00`, `F1 100` | 100-minute count-up preset preview/running/finished. |
| `F2 20:00` | 20-minute countdown preview. |
| `F3 17:00` | Fight Gone Bad preset, total programmed 17 minutes. |
| `F4` | Stopwatch preset. |
| `F5 4:00` | Built-in Tabata, 4 minutes work/rest time. |
| `UP 0:00`, `UP 1:00` | Custom count-up and chosen endpoint. |
| `dn 0:00`, `dn 5:00` | Custom countdown and starting amount. |
| `H1`, `H` | Custom interval work phase/programming. |
| `H2`, `P` | Custom interval rest phase/programming. |
| `01H 0:20` | Round 1, work phase, 20 seconds remaining (related timer). |
| `01P 0:10` | Round 1, rest phase, 10 seconds remaining (related timer). |
| `08P 0:00` | Eighth/final Tabata rest complete (related timer). |
| `12 C05` | Total 12 intervals, currently on round 5, in an informational query view (related timer). |
| `In 10:00` | Related timer's recall/memory display example. |
| `AL--on`, `AL-OFF` | Audio enabled/disabled on related timer. |
| `10 -- on`, `10 -OFF` | Ten-second preparation enabled/disabled on related timer. |

The blue characters represent **mode / round / phase information**, whereas the red digits usually represent the currently selected or running time. The photographed display supports this two-colour convention.

---

## 12. Compact button sequences, all documented operations

| Operation | Button sequence / action |
|---|---|
| Start 100-minute count-up | `EXIT? → F1 → OK` |
| Start 20-minute countdown | `EXIT? → F2 → OK` |
| Start Fight Gone Bad | `EXIT? → F3 → OK?` (`OK` required on related version; omitted in original description) |
| Start hundredths stopwatch | `EXIT? → F4 → OK` |
| Start preset Tabata | `EXIT? → F5 → OK` on related version |
| Set and run count-up target | `EXIT? → UP → LEFT → minutes → RIGHT → seconds → OK` |
| Set and run countdown | `EXIT? → DOWN → LEFT → minutes → RIGHT → seconds → OK` |
| Set and run repeated intervals | `EXIT? → SELECT → rounds → SELECT → work duration → SELECT → rest duration → OK` |
| Save a custom timer | Configure `UP`, `DOWN`, or `SELECT` mode, then choose a supported memory `F` key instead of `OK` |
| Run saved timer | `EXIT? → memory F-key → OK` |
| Pause active workout | `PAUSE` |
| Resume paused workout | `OK` on related version |
| Restart present workout | `RESTART`, possibly followed by `OK` depending on version |
| Exit current program | `EXIT` |
| Set wall-clock time | Clock mode → `LEFT` hours, `RIGHT` minutes → numeric input or legacy ± method → `OK` |
| Change clock 12/24 format | `12/24` or `12/24H` on legacy/related controls; no confirmed corresponding key on photographed remote |
| Toggle audible alarms | `F11` if compatible firmware; may instead be a memory slot |
| Toggle initial 10-second preparation | `F12` if compatible firmware; may instead be a memory slot |
| Toggle display | `POWER` from clock mode on related timer |
| Review intervals while running | `LEFT` or `RIGHT` on related timer; not present in original instructions |
| Blue `SET` | Undocumented for this exact controller |
| `*`, `#` | Undocumented for this exact controller |

`EXIT?` = `EXIT` **if currently in a different mode**; the original No Limits manual repeatedly notes that exiting the prior program may be necessary. `OK?` = version-dependent as explained above.

---

## 13. Differences between original No Limits and later/rebranded equipment

These are the known model/firmware conflicts, not confirmed quirks of this particular clock.

| Subject | Original MuscleDriver No Limits | Related Sport-Thieme seven-digit timer | Physical remote photo |
|---|---|---|---|
| Number adjustment | Uses `+` / `−` for most entry; also numbers for countdown/rounds | Numeric keys `0`–`9` for chosen fields | No dedicated labelled `+`/`−`; `*`, `#`, `SET` present |
| `F5` | May be programmable memory | Fixed Tabata mode | `TABATA` is printed at F5 |
| Saved program capacity | Up to 8 (`F5`–`F12`) | Up to 5 (`F6`–`F10`) | Function keys `F1` through `F12` |
| `F11` | Memory candidate | Mute toggle | No descriptive F11 label |
| `F12` | Memory candidate | 10-second preparation toggle | No descriptive F12 label |
| Stopwatch | Immediate start on `OK` | Immediate start on `OK` | `stopwatch` at F4 |
| FGB activation | `F3` explicitly, with no `OK` mentioned | `F3 → OK` | `FGB` at F3 |
| 12/24 clock control | Dedicated `12/24` referred to | Dedicated `12/24H` referred to | No visible `12/24` label |
| Pause/restart | Not explained in original PDF | Pause, resume, and restart described | Buttons present; compatibility with old host may vary |

Fringe Sport explicitly sells the photographed style of replacement remote for **No Limits / Limitless MuscleDriver timers** and states that the replacement can look different from the older original remote. This helps explain the discrepancies between the old PDF and the newer key labels.

---

## 14. Features or key behaviour not fully specified by available manuals

The following are **unknown**, rather than absent:

1. Whether custom minute/second fields require `3` or `03` for three minutes.
2. Whether leaving an already-zero seconds field unchanged is equivalent to explicitly entering `00`.
3. Whether the `*` / `#` keys implement any operation, including increment/decrement or toggling 12/24 clock mode.
4. What exactly the blue `SET` button does on this remote/host combination.
5. Whether the `UP`/`DOWN` arrows serve as increment/decrement in a secondary editing state.
6. Whether F11 and F12 toggle audio/prep or recall stored programs on this clock's firmware.
7. Whether F5 is always Tabata or may be a saved-program slot on older firmware.
8. Whether `F3` alone begins the FGB workout or `OK` is always required.
9. Whether `RESTART` starts a reset timer immediately, or merely resets it until `OK`.
10. Whether another `PAUSE` press resumes a paused workout.
11. Whether this particular replacement remote's `PAUSE` and `RESTART` commands work correctly with the installed host.
12. Whether saved programs persist after electrical power is removed.
13. Whether F11/F12 toggles persist between sessions or after power loss.
14. Whether `EXIT` once always returns directly to clock mode from all nested programming screens.
15. Whether `LEFT`/`RIGHT` during active interval timing invokes the related manual's temporary program-information view.
16. Whether a `00:00` work duration, `00:00` rest duration, or `00` rounds is rejected, skipped, or otherwise handled specially.
17. Whether modes can be reprogrammed mid-run without first pressing `EXIT`.
18. Whether the clock supports any factory reset, configuration menu, or IR pairing mode; neither cited operating manual documents these.

These alternative behaviours are included solely because the printed remote is newer than the original No Limits PDF and the firmware used by the installed wall display has not been positively identified.

---

## 15. Sources and scope

**Primary, official No Limits manual (3-page PDF):**  
MuscleDriver USA, *NO LIMITS Programmable Interval Timer Operation Manual*.  
https://cdn.shopify.com/s/files/1/0049/4272/files/no_limits_remote_instructions_2.pdf?v=1648304864

**Fringe Sport manufacturer/distributor, replacement remote:**  
*Remote Control for No Limits Timer*. Explains compatibility with older MuscleDriver No Limits/Limitless timers even where the replacement remote looks different; customer reviews include a report of nonfunctional pause/restart and missing +/- capability on an older host.  
https://www.fringesport.com/products/remote-control-for-no-limits-timer

**Related detailed operating manual (16-page PDF, English on pages 9–16):**  
Sport-Thieme, *Interval Timer with 7 LED ciphers*, product 282 2408. Covers the F1–F5 presets, F6–F10 memory slots, F11 mute, F12 prep toggle, button functions, timing and display examples, and custom work/rest programming. It describes a **similar timer**, not a proven identical firmware build.  
https://pimage.sport-thieme.ch/pdf/Anleitung_Sport-Thieme_Intervall_Timer_2822408_INT.pdf?_v=1138721

**Observed hardware:** Two user-supplied photographs of the Fringe Sport-labelled remote and blue/red wall display. Physical labels and button positions in this document derive from those photographs.

**Evidence boundary:** No authoritative source found supplies the **actual infrared carrier frequency, bit encodings, per-key IR codes,** or a confirmed one-digit-versus-two-digit time-entry demonstration on this precise replacement remote. This document describes the keypad's **logical operations** and never equates them to undocumented IR signal values.
