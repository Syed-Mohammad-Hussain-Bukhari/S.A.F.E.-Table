import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Heart, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const AIPersonalizationPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">AI Personalization</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-accent to-accent/50 mb-6">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4">
              Smart Recommendations Just for You
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our AI learns your preferences to suggest dishes you'll love
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6">
              <Heart className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Preference Learning</h3>
              <p className="text-muted-foreground">
                AI analyzes your past orders, favorites, and ratings to understand your unique taste profile
              </p>
            </Card>

            <Card className="p-6">
              <TrendingUp className="w-8 h-8 text-secondary mb-4" />
              <h3 className="text-xl font-bold mb-2">Dietary Tracking</h3>
              <p className="text-muted-foreground">
                Automatically filters dishes based on your dietary restrictions and nutritional goals
              </p>
            </Card>

            <Card className="p-6">
              <Users className="w-8 h-8 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-2">Group Matching</h3>
              <p className="text-muted-foreground">
                When dining with others, find dishes that match everyone's preferences
              </p>
            </Card>

            <Card className="p-6">
              <Sparkles className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Smart Suggestions</h3>
              <p className="text-muted-foreground">
                Get personalized recommendations based on time of day, weather, and trending dishes
              </p>
            </Card>
          </div>

          <div className="text-center">
            <Link to="/menu">
              <Button size="lg" className="group">
                Try Personalized Menu
                <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>);

};

export default AIPersonalizationPage;