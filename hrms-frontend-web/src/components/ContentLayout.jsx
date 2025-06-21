import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';

function ContentLayout({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-8 h-[calc(100vh-64px)] flex flex-col items-center w-full box-border overflow-x-hidden overflow-y-auto"
    >
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-3xl font-bold text-blue-800 mb-6 text-center"
      >
        {title}
      </motion.h1>
      <Card className="w-full max-w-[1200px] shadow-lg border">
        <CardContent className="p-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-full flex justify-center"
          >
            {children}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ContentLayout;