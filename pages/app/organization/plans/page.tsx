"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  min_seats: number;
  max_seats: number | null;
  base_price: number;
  additional_price: number | null;
  stripe_price_id: string;
  pricing_type: string;
  interval_type: string;
  interval_count: number;
}

export default function OrganizationPlansPage() {
  const [seatCount, setSeatCount] = useState(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("plans_pricing")
        .select("*")
        .eq("is_active", true)
        .neq("pricing_type", "additional_user")
        .order("min_seats", { ascending: true });
      if (error) {
        setError(error.message);
      } else {
        setPlans(data || []);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  function calculatePrice(seatCount: number) {
    if (seatCount <= 0 || plans.length === 0) return 0;
    const plan = plans.find(
      (p) =>
        seatCount >= p.min_seats &&
        (p.max_seats === null || seatCount <= p.max_seats)
    );
    if (!plan) return 0;

    // Tiered pricing from 5+ users: $199 base + $49 per additional user starting at the 5th
    if (
      plan.pricing_type === "multi_line_item" &&
      plan.additional_price &&
      seatCount > 4
    ) {
      return plan.base_price + (seatCount - 4) * plan.additional_price;
    }

    return plan.base_price;
  }

  const priceCents = calculatePrice(seatCount);

  // Get the interval display text based on the plan
  const getCurrentPlan = () => {
    return plans.find(
      (p) =>
        seatCount >= p.min_seats &&
        (p.max_seats === null || seatCount <= p.max_seats)
    );
  };

  const getIntervalText = (plan?: Plan) => {
    if (!plan) return "/ month";
    switch (plan.interval_type) {
      case "yearly":
        return "/ year";
      case "monthly":
        return "/ month";
      case "6-month":
        return "/ 6 months";
      default:
        return `/ ${plan.interval_type}`;
    }
  };

  const getShortIntervalText = (plan: Plan) => {
    switch (plan.interval_type) {
      case "yearly":
        return "/year";
      case "monthly":
        return "/mo";
      case "6-month":
        return "/6mo";
      default:
        return `/${plan.interval_type}`;
    }
  };

  const currentPlan = getCurrentPlan();

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = await createClient();
    const { data: userData, error } = await supabase.auth.getUser();
    const plan = plans.find(
      (p) =>
        seatCount >= p.min_seats &&
        (p.max_seats === null || seatCount <= p.max_seats)
    );
    if (!plan) {
      setError("No plan found for selected seat count.");
      setLoading(false);
      return;
    }
    try {

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_price_id: plan.stripe_price_id,
          seat_count: seatCount,
          plan_id: plan.id,
          user_id: userData.user?.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session.");
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 flex-col">
      <div className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Buy a License for Your Organization
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          Purchase a license for your organization and share the license code
          with your teammates. They can use this code to sign up and access the
          CrownPage app to build dynamic pages together. Easily manage your team
          and scale as you grow!
        </p>
      </div>
      <div className="w-full max-w-md">
        {loading && <div className="mb-4 text-center">Loading plans...</div>}
        {error && <div className="mb-4 text-center text-red-500">{error}</div>}
        <Card>
          <CardHeader>
            <CardTitle>Select Your Plan</CardTitle>
            <CardDescription>
              Choose the number of users (seats) for your organization. Pricing
              updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckout}>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block mb-2 font-medium">
                    Number of Users (Seats)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={seatCount}
                    onChange={(e) =>
                      setSeatCount(Math.max(1, Number(e.target.value)))
                    }
                    className="w-32"
                  />
                </div>
                <div className="text-lg font-semibold">
                  Total Price:{" "}
                  <span className="text-primary">${priceCents.toFixed(2)}</span>{" "}
                  {currentPlan ? getIntervalText(currentPlan) : "/ month"}
                </div>
                {currentPlan && currentPlan.pricing_type === "multi_line_item" && (
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const baseUsers = 4;
                      const additionalUsers = Math.max(0, seatCount - baseUsers);
                      const baseText = `Base (${baseUsers}+1 users): $${currentPlan.base_price.toFixed(2)}${getShortIntervalText(currentPlan)}`;
                      const addText = ` + ${additionalUsers} × $${(currentPlan.additional_price || 0).toFixed(2)}${getShortIntervalText(currentPlan)} per additional user`;
                      return additionalUsers > 0 ? (
                        <span>{baseText}{addText}</span>
                      ) : (
                        <span>{baseText}</span>
                      );
                    })()}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={seatCount < 1}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </form>
            <div className="mt-8">
              <h3 className="font-bold mb-2">Pricing Tiers</h3>
              <ul className="list-disc pl-5 text-sm">
                {plans.map((plan) => (
                  <li key={plan.id}>
                    {plan.max_seats
                      ? `${plan.min_seats} user${plan.min_seats > 1 ? "s" : ""
                      }: $${plan.base_price.toFixed(2)}${getShortIntervalText(plan)}`
                      : `${plan.min_seats}+ users: $${plan.base_price.toFixed(
                        2
                      )}${getShortIntervalText(plan)}${plan.additional_price
                        ? ` + $${plan.additional_price.toFixed(
                          2
                        )}${getShortIntervalText(plan)} per additional user`
                        : ""
                      }`}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
