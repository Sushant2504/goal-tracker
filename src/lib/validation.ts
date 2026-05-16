export const GOAL_RULES = {
  MAX_GOALS: 8,
  MIN_WEIGHTAGE: 10,
  TOTAL_WEIGHTAGE: 100,
} as const;

export interface GoalInput {
  thrustArea: string;
  title: string;
  description?: string;
  uomType: string;
  target: string;
  weightage: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGoals(goals: GoalInput[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (goals.length === 0) {
    errors.push({ field: "goals", message: "At least one goal is required" });
    return errors;
  }

  if (goals.length > GOAL_RULES.MAX_GOALS) {
    errors.push({
      field: "goals",
      message: `Maximum ${GOAL_RULES.MAX_GOALS} goals allowed`,
    });
  }

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  if (totalWeightage !== GOAL_RULES.TOTAL_WEIGHTAGE) {
    errors.push({
      field: "weightage",
      message: `Total weightage must equal ${GOAL_RULES.TOTAL_WEIGHTAGE}% (currently ${totalWeightage}%)`,
    });
  }

  goals.forEach((goal, i) => {
    if (goal.weightage < GOAL_RULES.MIN_WEIGHTAGE) {
      errors.push({
        field: `goals[${i}].weightage`,
        message: `Goal "${goal.title || i + 1}" weightage must be at least ${GOAL_RULES.MIN_WEIGHTAGE}%`,
      });
    }

    if (!goal.title.trim()) {
      errors.push({
        field: `goals[${i}].title`,
        message: `Goal ${i + 1} title is required`,
      });
    }

    if (!goal.thrustArea.trim()) {
      errors.push({
        field: `goals[${i}].thrustArea`,
        message: `Goal ${i + 1} thrust area is required`,
      });
    }

    if (!goal.target.trim()) {
      errors.push({
        field: `goals[${i}].target`,
        message: `Goal ${i + 1} target is required`,
      });
    }

    const validUomTypes = [
      "MIN_NUMERIC",
      "MIN_PERCENT",
      "MAX_NUMERIC",
      "MAX_PERCENT",
      "TIMELINE",
      "ZERO",
    ];
    if (!validUomTypes.includes(goal.uomType)) {
      errors.push({
        field: `goals[${i}].uomType`,
        message: `Goal ${i + 1} has invalid unit of measurement`,
      });
    }
  });

  return errors;
}
