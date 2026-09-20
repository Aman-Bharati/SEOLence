// Automated test suite for Login & Signup modal
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthModal } from "../AuthModal";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

describe("AuthModal - Login and Signup Automation Tests", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    // INTENTIONAL FAILURE FOR CI TESTING:
    expect("Actual Title").toBe("Intentionally Failing Test Title - Testing CI Error Detection");
    const { container } = render(<AuthModal isOpen={false} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render Sign In modal by default when isOpen is true", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("should switch mode between Sign In and Sign Up", () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Switch to Sign Up mode
    const signUpTabButton = screen.getByRole("button", { name: /^sign up$/i });
    fireEvent.click(signUpTabButton);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign up$/i })).toBeInTheDocument();

    // Switch back to Sign In mode
    const signInTabButton = screen.getByRole("button", { name: /^sign in$/i });
    fireEvent.click(signInTabButton);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("should validate that password is at least 6 characters", async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole("button", { name: /^sign in$/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters long/i)).toBeInTheDocument();
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("should trigger successful Sign In and close modal", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: { id: "123" }, session: {} },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it("should trigger successful Sign Up and show verification message", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: { id: "456" }, session: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.signUp>>);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    // Switch to Sign Up
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
      });
      expect(screen.getByText(/sign up successful! Please check your email inbox/i)).toBeInTheDocument();
    });
  });

  it("should display error message on authentication failure", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials", name: "AuthApiError", status: 400 },
    } as unknown as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>);

    render(<AuthModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });
});
