import singleton from "https://raw.githubusercontent.com/grevend/singleton/main/mod.ts";
export type VPinNumber =
  | 2
  | 3
  | 4
  | 17
  | 27
  | 22
  | 10
  | 9
  | 11
  | 0
  | 5
  | 6
  | 13
  | 19
  | 26
  | 14
  | 15
  | 18
  | 23
  | 24
  | 25
  | 8
  | 7
  | 1
  | 12
  | 16
  | 20
  | 21;
export enum PinDirection {
  IN = "in",
  OUT = "out",
}

/**
 * Not adding sudo might misbehave on repeated runs.
 */
// deno-lint-ignore prefer-const
export let FORCE_SUDO = true;

export class InstructionsQueue {
  private cmd: string[] = [];
  add(c: string) {
    this.cmd.push(c);
  }
  async execute() {
    await Deno.run({
      cmd: [
        ...(FORCE_SUDO ? ["sudo"] : []),
        "bash",
        "-c",
        `${this.cmd.join(";")}`,
      ],
    }).status();
    this.cmd = [];
  }
}
export const instructionsQueue = singleton(() => new InstructionsQueue());

/**
 * executes the instructions added above or within the method (i.e. executes the instruction queue).
 * > Executing instructions will clear the instruction queue.
 * @example ```TypeScript
const led = new Pin(24, PinDirection.OUT, 1);
sleep(5);
led.setValue(0);
led.unexport();
executeInstructions(); // executes the above instructions.

// OR

const led = new Pin(24, PinDirection.OUT, 1);
executeInstructions(
     sleep(5),
     led.setValue(0),
     led.unexport()
); // executes the above instructions.
 * ```
 * @param _ This parameter does nothing. It is used to help structure code
 * @returns a promise that resolves when all the instructions finished executing
 */
export async function executeInstructions(..._: unknown[]) {
  return await instructionsQueue.getInstance().execute();
}

type PinValue = 1 | 0;

/**
 * Sleeps in between commands for the given seconds. milliseconds, micro and nano seconds are supported.
 * > to sleep for 40 microseconds you may use ``` sleep(4e-5); ```
 * @param seconds the seconds to sleep for.
 */
export function sleep(seconds: number) {
  instructionsQueue.getInstance().add(`sleep ${seconds}`);
}
export class Pin {
  readonly number: VPinNumber;

  /**
   * Instantiates a new pin for usage.
   * > This new pin will queue up an export instruction. you must execute these manually using the executeInstructions method
   * @param number The GPIO pin number (e.g. GPIO23 -> 23)
   * @param direction The current flow direction. in being to receive and out being to send out
   * @param initialState optional property to automatically set the state as soon as pin is exported
   * @param options further configuration.
   */
  constructor(
    number: VPinNumber,
    direction: PinDirection,
    initialState?: PinValue,
  ) {
    this.number = number;
    Pin.export(this);
    this.setDirection(direction);
    if (initialState !== undefined) this.setValue(initialState);
  }

  /**
   * Reads the value of this pin.
   * > NOTE: this method is not very precise (timing wise). use pipeValue to queue up an instruction and execute with precise timing.
   * @returns the value of the pin (1 or 0)
   */
  readValue(): number {
    return Deno.readFileSync(`/sys/class/gpio/gpio${this.number}/value`)[0] -
      48;
  }
  // TODO: wait for value method? i.e. wait for 1 or 0.. async and sync versions??

  /**
   * Queues up an instruction that waits until the pin is of the given value before continuing execution.
   * > This instruction blocks all further scripts until the pin is of the given value.
   * @param pinValue the pin value to wait for. defaults to 1 (HIGH)
   */
  waitForValue(pinValue: PinValue = 1){
    instructionsQueue.getInstance().add(
      `while true; do  if grep -q -m 1 ${pinValue} /sys/class/gpio/gpio${this.number}/value; then break;  fi; done`
    )
  }

  /**
   * Queues up an instruction to set the pin value.
   * > to be used when the direction is set to out.
   * @param value 0 for low, 1 for high
   */
  setValue(value: PinValue) {
    instructionsQueue.getInstance().add(
      `echo ${value} > /sys/class/gpio/gpio${this.number}/value`,
    );
  }

  /**
   * Queues up an instruction to set the pin direction (in or out).
   * @param d the direction
   */
  setDirection(d: PinDirection) {
    instructionsQueue.getInstance().add(
      `echo ${d} > /sys/class/gpio/gpio${this.number}/direction`,
    );
  }

  /**
   * Fetches the current pin direction from the system.
   * > Useful if other programs will be changing the pin direction.
   * @returns the pin direction
   */
  getDirection(): PinDirection {
    return Deno.readTextFileSync(`/sys/class/gpio/gpio${this.number}/direction`)
        .includes("out")
      ? PinDirection.OUT
      : PinDirection.IN;
  }

  /**
   * Queues up an instruction to export the provided pin.
   * This is required before you operate with the pin.
   * @param pin the pin to export
   */
  static export(pin: Pin) {
    instructionsQueue.getInstance().add(
      `echo ${pin.number.toString()} > /sys/class/gpio/export`,
    );
  }

  /**
   * Queues up an instruction to unexport this pin.
   */
  unexport() {
    return Pin.unexport(this);
  }

  /**
   * Queues up an instruction to unexport the provided pin
   * @param pin
   */
  static unexport(pin: Pin | number) {
    const pinNumber: string = (typeof pin === "number" ? pin : pin.number)
      .toString();
    instructionsQueue.getInstance().add(
      `echo ${pinNumber} > /sys/class/gpio/unexport`,
    );
  }

  /**
   * Checks if this pin is already exported.
   * @returns true if the pin is exported, false otherwise.
   */
  isExported() {
    return Pin.isExported(this);
  }

  /**
   * Checks if the given pin is exported or not
   * @param pin the pin number
   * @returns
   */
  static isExported(pin: Pin): boolean {
    for (const { name } of Deno.readDirSync("/sys/class/gpio")) {
      if (name.includes(`gpio${pin.number}`)) return true;
    }
    return false;
  }

  /**
   * Queues up an instruction to pipe the pin value to a buffer file which can later be read from.
   * This method can be used when micro or nanosecond precision is needed in between reads.
   * > This method appends to the file each time a value is read. (note: appends on a new line each time)
   */
  pipeValue(filePath: string) {
    instructionsQueue.getInstance().add(
      `head -n 1 /sys/class/gpio/gpio${this.number}/value >> ${filePath}`,
    );
  }
}
