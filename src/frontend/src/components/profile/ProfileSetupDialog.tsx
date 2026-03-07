import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { useState } from "react";

export default function ProfileSetupDialog() {
  // Deprecated: No longer used in local-first mode
  // Kept for compatibility but should not be rendered
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // No-op: no backend profile to save
  };

  return (
    <Dialog open={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Welcome to Sleep Tracker
          </DialogTitle>
          <DialogDescription>
            Please enter your name to personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
