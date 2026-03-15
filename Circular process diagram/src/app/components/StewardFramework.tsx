import { motion } from 'motion/react';
import { useState } from 'react';

interface StepData {
  letter: string;
  number: number;
  title: string;
  description: string;
}

const stewardSteps: StepData[] = [
  {
    letter: 'S',
    number: 1,
    title: 'Scope the Responsibility',
    description: 'Define what the commitment actually requires.',
  },
  {
    letter: 'T',
    number: 2,
    title: 'Trade-Off Analysis',
    description: 'Understand what this decision will displace.',
  },
  {
    letter: 'E',
    number: 3,
    title: 'Energy Audit',
    description: 'Assess physical, emotional, and cognitive capacity.',
  },
  {
    letter: 'W',
    number: 4,
    title: 'Weighted Priorities',
    description: 'Determine whether the commitment advances the mission.',
  },
  {
    letter: 'A',
    number: 5,
    title: 'Risk Anticipation',
    description: 'Identify possible consequences, and overextension.',
  },
  {
    letter: 'R',
    number: 6,
    title: 'Resource Allocation',
    description: 'Define structure, expectations, and limits.',
  },
  {
    letter: 'D',
    number: 7,
    title: 'Deliberate Boundaries',
    description: 'Define structure, expectations, and limits.',
  },
];

export function StewardFramework() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const centerX = 300;
  const centerY = 300;
  const radius = 160; // Reduced radius to bring letters closer to center

  const getPosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl tracking-wide mb-2" style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>
            The STEWARD Framework
          </h1>
        </motion.div>

        {/* Main Diagram */}
        <div className="relative flex justify-center">
          <svg
            width="600"
            height="600"
            className="overflow-visible"
          >
            {/* Outer circle ring */}
            <motion.circle
              cx={centerX}
              cy={centerY}
              r={radius + 20}
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />

            {/* Center circle background */}
            <motion.circle
              cx={centerX}
              cy={centerY}
              r="90"
              fill="#1a2332"
              stroke="#d4af37"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            />

            {/* Center text */}
            <motion.text
              x={centerX}
              y={centerY - 15}
              textAnchor="middle"
              className="fill-[#d4af37]"
              style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'Georgia, serif', letterSpacing: '0.1em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              STEWARD
            </motion.text>
            <motion.text
              x={centerX}
              y={centerY + 10}
              textAnchor="middle"
              className="fill-[#d4af37]"
              style={{ fontSize: '13px', fontWeight: '400', fontFamily: 'Georgia, serif', opacity: 0.8 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              Framework™
            </motion.text>
            <motion.text
              x={centerX}
              y={centerY + 28}
              textAnchor="middle"
              className="fill-[#d4af37]"
              style={{ fontSize: '11px', fontStyle: 'italic', fontFamily: 'Georgia, serif', opacity: 0.7 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.4, duration: 0.8 }}
            >
              Leadership Stewardship Cycle
            </motion.text>

            {/* Connecting arrows between segments */}
            {stewardSteps.map((_, index) => {
              const start = getPosition(index, stewardSteps.length);
              const end = getPosition((index + 1) % stewardSteps.length, stewardSteps.length);
              
              // Calculate control point for curved arrow on outer ring
              const midAngle = ((index + 0.5) * 2 * Math.PI) / stewardSteps.length - Math.PI / 2;
              const controlRadius = radius + 20;
              const controlX = centerX + controlRadius * Math.cos(midAngle);
              const controlY = centerY + controlRadius * Math.sin(midAngle);

              return (
                <motion.path
                  key={`arrow-${index}`}
                  d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead-gold)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ delay: 1.5 + index * 0.1, duration: 0.5 }}
                />
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead-gold"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#d4af37" opacity="0.8" />
              </marker>
            </defs>
          </svg>

          {/* Step nodes */}
          {stewardSteps.map((step, index) => {
            const position = getPosition(index, stewardSteps.length);
            const isActive = activeStep === step.number;

            return (
              <motion.div
                key={step.number}
                className="absolute cursor-pointer"
                style={{
                  left: position.x,
                  top: position.y,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9 + index * 0.12, duration: 0.5 }}
                whileHover={{ scale: 1.15 }}
                onHoverStart={() => setActiveStep(step.number)}
                onHoverEnd={() => setActiveStep(null)}
              >
                {/* Glow effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{ backgroundColor: '#d4af37' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                  />
                )}

                {/* Segment circle */}
                <div
                  className="relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? '#2a3547' : '#1a2332',
                    borderColor: '#d4af37',
                    boxShadow: isActive ? '0 0 30px rgba(212, 175, 55, 0.4)' : 'none',
                  }}
                >
                  <span
                    className="text-4xl transition-all duration-300"
                    style={{
                      color: '#d4af37',
                      fontFamily: 'Georgia, serif',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {step.letter}
                  </span>
                </div>

                {/* Step number badge */}
                <div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: '#d4af37',
                    color: '#0f1629',
                    fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                  }}
                >
                  {step.number}
                </div>

                {/* Tooltip on hover */}
                {isActive && (
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 bg-[#1a2332] rounded-lg shadow-2xl p-5 w-72 z-10 border-2"
                    style={{
                      top: index < 3.5 ? '90px' : '-170px',
                      borderColor: '#d4af37',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(212, 175, 55, 0.2)',
                    }}
                    initial={{ opacity: 0, y: index < 3.5 ? -10 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        [index < 3.5 ? 'top' : 'bottom']: '-10px',
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        [index < 3.5 ? 'borderBottom' : 'borderTop']: '10px solid #d4af37',
                      }}
                    />
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                        style={{ borderColor: '#d4af37', backgroundColor: '#0f1629' }}
                      >
                        <span style={{ color: '#d4af37', fontSize: '20px', fontWeight: '700' }}>
                          {step.number}
                        </span>
                      </div>
                      <h3
                        className="flex-1"
                        style={{
                          color: '#d4af37',
                          fontSize: '16px',
                          fontWeight: '600',
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#c9d1d9' }}
                    >
                      {step.description}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}