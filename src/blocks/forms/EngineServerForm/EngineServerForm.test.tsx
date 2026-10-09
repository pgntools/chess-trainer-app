import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineServerForm, { type EngineServerConnectFeedback, type EngineServerFormStatus } from "./EngineServerForm";
import { CONNECTING, EXAMPLE_URL, NOT_AN_ENGINE_SERVER, ONLINE, UNREACHABLE } from "./fixtures";

type Mount = {
  enabled?: boolean;
  address?: string;
  addressInvalid?: boolean;
  connectFeedback?: EngineServerConnectFeedback;
  status?: EngineServerFormStatus;
  children?: React.ReactNode;
};

const mount = ({ enabled = true, address = EXAMPLE_URL, addressInvalid = false, connectFeedback = "idle", status, children }: Mount = {}) => {
  const props = {
    onEnabledChange: vi.fn(),
    onAddressChange: vi.fn(),
    onConnect: vi.fn(),
  };
  render(
    <EngineServerForm
      enabled={enabled}
      address={address}
      addressInvalid={addressInvalid}
      connectFeedback={connectFeedback}
      example={EXAMPLE_URL}
      status={status}
      testId="server"
      {...props}
    >
      {children}
    </EngineServerForm>,
  );
  return props;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineServerForm", () => {
  it("is off by default: the switch alone, saying the app contacts nothing", async () => {
    const { onEnabledChange } = mount({ enabled: false });

    const toggle = screen.getByRole("switch", { name: "Use an engine server" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/never contacts it/);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    await userEvent.click(toggle);
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });

  it("on, takes the address — left to right — and keeps it with Connect or Enter", async () => {
    const { onAddressChange, onConnect } = mount({ status: ONLINE });

    const field = screen.getByRole("textbox", { name: "Server address" });
    expect(field).toHaveValue(EXAMPLE_URL);
    expect(field).toHaveAttribute("dir", "ltr");
    await userEvent.type(field, "/");
    expect(onAddressChange).toHaveBeenLastCalledWith(`${EXAMPLE_URL}/`);

    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.type(field, "{Enter}");
    expect(onConnect).toHaveBeenCalledTimes(2);
  });

  it("says what is wrong with an address that is not one, and will not connect to it", async () => {
    const { onConnect } = mount({ address: "127.0.0.1:8800", addressInvalid: true });

    expect(screen.getByRole("textbox", { name: "Server address" })).toHaveAccessibleDescription(/Enter an address like/);
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: "Server address" }), "{Enter}");
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("shows the connection at a glance in a chip — the live region", () => {
    const cases: [EngineServerFormStatus, string, string][] = [
      [CONNECTING, "connecting", "Connecting…"],
      [ONLINE, "online", "Connected · 4 ms"],
      [UNREACHABLE, "offline", "Not connected"],
    ];
    for (const [status, state, words] of cases) {
      const { unmount } = render(
        <EngineServerForm
          enabled
          onEnabledChange={() => {}}
          address={EXAMPLE_URL}
          onAddressChange={() => {}}
          onConnect={() => {}}
          connectFeedback="idle"
          addressInvalid={false}
          example={EXAMPLE_URL}
          status={status}
          testId="server"
        />,
      );
      const region = screen.getByTestId("server-indicator-region");
      expect(region).toHaveAttribute("role", "status");
      expect(within(region).getByTestId("server-indicator")).toHaveAttribute("data-state", state);
      expect(region).toHaveTextContent(words);
      unmount();
    }
  });

  it("says when the server last answered", () => {
    mount({ status: ONLINE });
    expect(screen.getByTestId("server-status")).toHaveTextContent(/^Checked at .+\.$/);
  });

  it("says what to check when it cannot reach the server, with a way to try again", async () => {
    const { onConnect } = mount({ status: UNREACHABLE });

    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach");
    expect(screen.getByRole("alert")).toHaveTextContent("Is the server running?");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("tells something that answered but is no engine server from one that did not", () => {
    mount({ status: NOT_AN_ENGINE_SERVER });
    expect(screen.getByRole("alert")).toHaveTextContent("answered, but not as an engine server");
  });

  it("answers each Connect on the button — and keeps its name, so it is always found", () => {
    for (const feedback of ["checking", "answered", "failed"] as const) {
      const { unmount } = render(
        <EngineServerForm
          enabled
          onEnabledChange={() => {}}
          address={EXAMPLE_URL}
          onAddressChange={() => {}}
          onConnect={() => {}}
          connectFeedback={feedback}
          addressInvalid={false}
          example={EXAMPLE_URL}
          status={ONLINE}
          testId="server"
        />,
      );
      const button = screen.getByRole("button", { name: "Connect" });
      expect(button).toHaveAttribute("data-feedback", feedback);
      if (feedback === "checking") expect(button).toBeDisabled();
      else expect(button).toBeEnabled();
      unmount();
    }
  });

  it("puts what the screen hands it under the details while on — and nothing while off", () => {
    mount({ status: ONLINE, children: <p>the server's engines</p> });
    expect(screen.getByText("the server's engines")).toBeInTheDocument();
  });

  it("reads in Hebrew, the address still left to right", async () => {
    await i18n.changeLanguage("he");
    mount({ status: UNREACHABLE });

    expect(screen.getByRole("switch", { name: "שימוש בשרת מנוע" })).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toContain(`⁦${EXAMPLE_URL}⁩`);
  });

  it("passes axe, on and connected", async () => {
    mount({ status: ONLINE, connectFeedback: "answered" });
    await expectNoAxeViolations();
  });
});
