import { motion } from 'motion/react';
import { ArrowRight, Target, Lightbulb, Cog, TrendingUp, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const processSteps: ProcessStep[] = [
  {
    id: 1,
    title: 'Define Goals',
    description: 'Identify objectives and requirements',
    icon: Target,
    color: '#3b82f6',
  },
  {
    id: 2,
    title: 'Ideate',
    description: 'Brainstorm solutions and strategies',
    icon: Lightbulb,
    color: '#f59e0b',
  },
  {
    id: 3,
    title: 'Execute',
    description: 'Implement the planned solutions',
    icon: Cog,
    color: '#10b981',
  },
  {
    id: 4,
    title: 'Analyze',
    description: 'Review results and gather insights',
    icon: TrendingUp,
    color: '#8b5cf6',
  },
  {
    id: 5,
    title: 'Optimize',
    description: 'Refine and improve processes',
    icon: CheckCircle,
    color: '#ec4899',
  },
];

export function CircularProcess() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const centerX = 250;
  const centerY = 250;
  const radius = 140;

  const getPosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl mb-3">Continuous Process Cycle</h1>
        <p className="text-lg text-gray-600">
          An iterative approach to sustainable growth
        </p>
      </div>

      <div className="relative flex justify-center">
        <svg
          width="500"
          height="500"
          className="overflow-visible"
        >
          {/* Outer circle */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="8 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />

          {/* Center circle */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r="50"
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />

          {/* Center text */}
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="text-sm fill-gray-700"
            style={{ fontSize: '14px', fontWeight: '600' }}
          >
            Process
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            className="text-sm fill-gray-700"
            style={{ fontSize: '14px', fontWeight: '600' }}
          >
            Loop
          </text>

          {/* Connecting arrows */}
          {processSteps.map((_, index) => {
            const start = getPosition(index, processSteps.length);
            const end = getPosition(
              (index + 1) % processSteps.length,
              processSteps.length
            );
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <motion.path
                key={`arrow-${index}`}
                d={`M ${start.x} ${start.y} Q ${midX * 0.7 + centerX * 0.3} ${
                  midY * 0.7 + centerY * 0.3
                } ${end.x} ${end.y}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
              />
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#cbd5e1" />
            </marker>
          </defs>
        </svg>

        {/* Process step nodes */}
        {processSteps.map((step, index) => {
          const position = getPosition(index, processSteps.length);
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <motion.div
              key={step.id}
              className="absolute cursor-pointer"
              style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 + index * 0.15, duration: 0.4 }}
              whileHover={{ scale: 1.1 }}
              onHoverStart={() => setActiveStep(step.id)}
              onHoverEnd={() => setActiveStep(null)}
            >
              <motion.div
                className="relative"
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Glow effect when active */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{ backgroundColor: step.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 0.2 }}
                  />
                )}

                {/* Icon container */}
                <div
                  className="relative w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center border-4"
                  style={{ borderColor: step.color }}
                >
                  <Icon size={32} style={{ color: step.color }} />
                </div>

                {/* Step number badge */}
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-md"
                  style={{ backgroundColor: step.color }}
                >
                  {step.id}
                </div>

                {/* Tooltip */}
                {isActive && (
                  <motion.div
                    className="absolute top-24 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl p-4 w-48 z-10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"
                      style={{ borderTop: `2px solid ${step.color}`, borderLeft: `2px solid ${step.color}` }}
                    />
                    <h3
                      className="font-bold mb-1"
                      style={{ color: step.color }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {step.description}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-4">
        {processSteps.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer"
              whileHover={{ scale: 1.02, backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              onHoverStart={() => setActiveStep(step.id)}
              onHoverEnd={() => setActiveStep(null)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${step.color}20` }}
              >
                <Icon size={20} style={{ color: step.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm" style={{ color: step.color }}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {step.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
