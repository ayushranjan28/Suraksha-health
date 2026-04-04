'use client';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const getStrength = (pwd: string): { score: number; label: string; colors: string[] } => {
    if (!pwd) return { score: 0, label: '', colors: ['bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'] };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const colorMap: Record<number, { label: string; colors: string[] }> = {
      0: { label: '', colors: ['bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'] },
      1: { label: 'Weak', colors: ['bg-red-500', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'] },
      2: { label: 'Fair', colors: ['bg-orange-500', 'bg-orange-500', 'bg-gray-200', 'bg-gray-200'] },
      3: { label: 'Good', colors: ['bg-yellow-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-gray-200'] },
      4: { label: 'Strong', colors: ['bg-green-500', 'bg-green-500', 'bg-green-500', 'bg-green-500'] },
    };

    return { score, ...colorMap[score] };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {strength.colors.map((color, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${color} dark:opacity-90`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-medium transition-colors ${
          strength.score === 1
            ? 'text-red-600 dark:text-red-400'
            : strength.score === 2
            ? 'text-orange-600 dark:text-orange-400'
            : strength.score === 3
            ? 'text-yellow-600 dark:text-yellow-400'
            : strength.score === 4
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-400'
        }`}
      >
        {strength.label}
      </p>
    </div>
  );
}
